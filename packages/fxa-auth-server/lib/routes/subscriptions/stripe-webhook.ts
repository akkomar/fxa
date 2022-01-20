/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
import { ServerRoute } from '@hapi/hapi';
import isA from '@hapi/joi';
import * as Sentry from '@sentry/node';
import { Account } from 'fxa-shared/db/models/auth';
import { ACTIVE_SUBSCRIPTION_STATUSES } from 'fxa-shared/subscriptions/stripe';
import { Stripe } from 'stripe';
import Container from 'typedi';

import { ConfigType } from '../../../config';
import {
  formatMetadataValidationErrorMessage,
  reportSentryError,
  reportValidationError,
} from '../../../lib/sentry';
import error from '../../error';
import { CapabilityService } from '../../payments/capability';
import { PayPalHelper } from '../../payments/paypal';
import {
  INVOICES_RESOURCE,
  StripeHelper,
  STRIPE_OBJECT_TYPE_TO_RESOURCE,
  SUBSCRIPTION_UPDATE_TYPES,
  VALID_RESOURCE_TYPES,
} from '../../payments/stripe';
import { AuthLogger, AuthRequest } from '../../types';
import { subscriptionProductMetadataValidator } from '../validators';
import { StripeHandler } from './stripe';

const IGNORABLE_STRIPE_WEBHOOK_ERRNOS = [
  error.ERRNO.UNKNOWN_SUBSCRIPTION_FOR_SOURCE,
  error.ERRNO.BOUNCE_HARD,
  error.ERRNO.BOUNCE_COMPLAINT,
];

export class StripeWebhookHandler extends StripeHandler {
  protected capabilityService: CapabilityService;
  protected paypalHelper?: PayPalHelper;

  constructor(
    log: AuthLogger,
    db: any,
    config: ConfigType,
    customs: any,
    push: any,
    mailer: any,
    profile: any,
    stripeHelper: StripeHelper
  ) {
    super(log, db, config, customs, push, mailer, profile, stripeHelper);
    if (config.subscriptions.paypalNvpSigCredentials.enabled) {
      this.paypalHelper = Container.get(PayPalHelper);
    }
    this.capabilityService = Container.get(CapabilityService);
  }

  /**
   * Handle webhook events from Stripe by pre-processing the incoming
   * event and dispatching to the appropriate sub-handler. Log an info
   * message for events we don't yet handle.
   */
  async handleWebhookEvent(request: AuthRequest) {
    try {
      const event = this.stripeHelper.constructWebhookEvent(
        request.payload,
        request.headers['stripe-signature']
      );

      // This must run before expansion below to ensure the types that Firestore
      // can store are updated first to prevent multiple fetches from Stripe.
      const firestoreHandled =
        await this.stripeHelper.processWebhookEventToFirestore(event);

      // Ensure the object is the latest version.
      const stripeObject = event.data.object as Record<string, any>;
      const resourceType =
        STRIPE_OBJECT_TYPE_TO_RESOURCE[stripeObject.object as string];
      if (resourceType) {
        // Replace the object with the latest version if we support this object.
        event.data.object = await this.stripeHelper.expandResource(
          stripeObject.id,
          resourceType as typeof VALID_RESOURCE_TYPES[number]
        );
      } else {
        // We shouldn't be handling events that we can't fetch the latest version
        // of with expandResource. If we have a handler below for this type, then
        // we should have it included as a resource type to expand above.
        Sentry.withScope((scope) => {
          scope.setContext('stripeEvent', {
            event: {
              id: event.id,
              type: event.type,
              objectType: (event.data.object as any).object,
            },
          });
          Sentry.captureMessage(
            'Event being handled that is not using latest object from Stripe.',
            Sentry.Severity.Info
          );
        });
      }

      switch (event.type as Stripe.WebhookEndpointUpdateParams.EnabledEvent) {
        case 'credit_note.created':
          if (this.paypalHelper) {
            await this.handleCreditNoteEvent(request, event);
          }
          break;
        case 'coupon.created':
        case 'coupon.updated':
          await this.handleCouponEvent(request, event);
          break;
        case 'customer.created':
          // We don't need to setup the local customer if it happened via API
          // because we already set this up during creation.
          if (event.request?.id) {
            break;
          }
          await this.handleCustomerCreatedEvent(request, event);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreatedEvent(request, event);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdatedEvent(request, event);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeletedEvent(request, event);
          break;
        case 'customer.source.expiring':
          await this.handleCustomerSourceExpiringEvent(request, event);
          break;
        case 'customer.updated':
          await this.handleCustomerUpdatedEvent(request, event);
          break;
        case 'invoice.created':
          if (this.paypalHelper) {
            await this.handleInvoiceCreatedEvent(request, event);
          }
          break;
        case 'invoice.paid':
          await this.handleInvoicePaidEvent(request, event);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailedEvent(request, event);
          break;
        case 'product.created':
        case 'product.updated':
        case 'product.deleted':
          await this.handleProductWebhookEvent(request, event);
          break;
        case 'plan.created':
        case 'plan.updated':
          await this.handlePlanCreatedOrUpdatedEvent(request, event);
          break;
        case 'plan.deleted':
          await this.handlePlanDeletedEvent(request, event);
          break;
        case 'tax_rate.created':
        case 'tax_rate.updated':
          await this.handleTaxRateCreatedOrUpdatedEvent(request, event);
          break;
        default:
          if (!firestoreHandled) {
            Sentry.withScope((scope) => {
              scope.setContext('stripeEvent', {
                event: { id: event.id, type: event.type },
              });
              Sentry.captureMessage(
                'Unhandled Stripe event received.',
                Sentry.Severity.Info
              );
            });
          }
          break;
      }
    } catch (error) {
      if (!IGNORABLE_STRIPE_WEBHOOK_ERRNOS.includes(error.errno)) {
        // Error is not ignorable, so re-throw.
        throw error;
      }
      // Caught an ignorable error, so let's log but continue to 200 OK response
      this.log.error('subscriptions.handleWebhookEvent.failure', { error });
    }
    return {};
  }

  /**
   * Handle `credit_note.created` Stripe webhook events.
   */
  async handleCreditNoteEvent(request: AuthRequest, event: Stripe.Event) {
    // Type-guard to require paypalHelper.
    if (!this.paypalHelper) {
      return;
    }
    const creditNote = event.data.object as Stripe.CreditNote;
    const invoice = await this.stripeHelper.expandResource(
      creditNote.invoice,
      'invoices'
    );

    if (invoice.collection_method === 'charge_automatically') {
      // This is a Stripe charge, report if needed and return as Stripe handles
      // refunding the customer.
      if (
        creditNote.customer_balance_transaction ||
        creditNote.out_of_band_amount
      ) {
        // We should be informed if it was applied to the account balance as they
        // should be refunded to the card or if it was applied out of band.
        reportSentryError(
          new Error(
            `Credit note issued for account balance or out of band: ${creditNote.id}`
          ),
          request
        );
      }

      return;
    }

    // We can't issue a refund if there's no paypal transaction to refund.
    const transactionId =
      this.stripeHelper.getInvoicePaypalTransactionId(invoice);
    if (!transactionId) {
      this.log.error('handleCreditNoteEvent', {
        invoiceId: invoice.id,
        message:
          'Credit note issued on invoice without a PayPal transaction id.',
      });
      return;
    }

    // If the amount doesn't match the invoice we can't reverse it.
    if (creditNote.out_of_band_amount !== invoice.amount_due) {
      this.log.error('handleCreditNoteEvent', {
        invoiceId: invoice.id,
        message: 'Credit note does not match invoice amount.',
      });
      reportSentryError(
        new Error(`Mismatched credit amount on invoice: ${invoice.id}.`),
        request
      );
      return;
    }
    await this.paypalHelper.issueRefund(invoice, transactionId);
    return;
  }

  /**
   * Handle `coupon.created` and `coupon.updated` Stripe webhook events.
   *
   * Verify that the coupon conforms to our requirements, currently that it:
   *  - Does not have a product ID requirement.
   */
  async handleCouponEvent(request: AuthRequest, event: Stripe.Event) {
    const eventCoupon = event.data.object as Stripe.Coupon;
    const coupon = await this.stripeHelper.getCoupon(eventCoupon.id);

    if (coupon.applies_to?.products && coupon.applies_to?.products.length > 0) {
      reportSentryError(
        new Error(`Coupon has a product requirement: ${coupon.id}.`),
        request
      );
      return;
    }
  }

  /**
   * Handle `customer.created` Stripe webhook events.
   */
  async handleCustomerCreatedEvent(_: AuthRequest, event: Stripe.Event) {
    const customer = event.data.object as Stripe.Customer;
    const account = await this.db.accountRecord(customer.email);
    await this.stripeHelper.createLocalCustomer(account.uid, customer);
  }

  /**
   * Handle `subscription.created` Stripe webhook events.
   *
   * Only subscriptions that are active/trialing are valid. Emit an event for
   * those conditions only.
   */
  async handleSubscriptionCreatedEvent(
    request: AuthRequest,
    event: Stripe.Event
  ) {
    const sub = event.data.object as Stripe.Subscription;
    if (ACTIVE_SUBSCRIPTION_STATUSES.includes(sub.status)) {
      return this.capabilityService.stripeUpdate({ sub });
    }
    return;
  }

  /**
   * Handle `subscription.updated` Stripe webhook events.
   *
   * The only time this requires us to emit a subscription event is when an
   * existing incomplete subscription has now been completed. Unpaid renewals and
   * subscriptions that are cancelled result in a `subscription.deleted` event.
   */
  async handleSubscriptionUpdatedEvent(
    request: AuthRequest,
    event: Stripe.Event
  ) {
    const sub = event.data.object as Stripe.Subscription;

    let uid, email;
    try {
      ({ uid, email } = await this.sendSubscriptionUpdatedEmail(event));
    } catch (err) {
      // It's unexpected that we don't know about the customer or an error happens.
      if (err.output && typeof err.output.payload === 'object') {
        err.output.payload = { ...err.output.payload, eventId: event.id };
      }
      reportSentryError(err, request);
      return;
    }

    // if the subscription changed from 'incomplete' to 'active' or 'trialing'
    if (
      ['active', 'trialing'].includes(sub.status) &&
      (event.data?.previous_attributes as any)?.status === 'incomplete'
    ) {
      return this.capabilityService.stripeUpdate({ sub, uid });
    }
    return;
  }

  /**
   * Handle `subscription.deleted` Stripe wehbook events.
   */
  async handleSubscriptionDeletedEvent(
    request: AuthRequest,
    event: Stripe.Event
  ) {
    const sub = event.data.object as Stripe.Subscription;
    let uid;
    try {
      ({ uid } = await this.sendSubscriptionDeletedEmail(sub));
    } catch (err) {
      // FIXME: If the customer was deleted, we don't send an email that their subscription
      //        was cancelled. This is because the email requires a bunch of details that
      //        only exist on non-deleted customer. A more robust solution is needed.
      if (err.errno === error.ERRNO.UNKNOWN_SUBSCRIPTION_CUSTOMER) {
        return;
      }
      reportSentryError(err, request);
      return;
    }
    await this.capabilityService.stripeUpdate({ sub, uid });
    if (this.paypalHelper) {
      const customer = await this.stripeHelper.fetchCustomer(uid, [
        'subscriptions',
      ]);
      if (!customer || customer.deleted) {
        return;
      }
      return this.paypalHelper.conditionallyRemoveBillingAgreement(customer);
    }
    return;
  }

  /**
   * Handle `customer.updated` events, this ensures metadata changes to the
   * customer are reflected correctly in our cached copy.
   */
  async handleCustomerUpdatedEvent(request: AuthRequest, event: Stripe.Event) {
    const customer = event.data.object as Stripe.Customer;
    const uid = customer.metadata.userid;
    const account = await Account.findByUid(uid, { include: ['emails'] });
    if (!account) {
      reportSentryError(
        new Error(`Cannot load account for customerId: ${customer.id}`),
        request
      );
      return;
    }
  }

  /**
   * Handle `invoice.created` events, if the subscription is for an invoice
   * customer (PayPal), set auto_advance false and finalize.
   */
  async handleInvoiceCreatedEvent(request: AuthRequest, event: Stripe.Event) {
    // Type-guard to require paypalHelper.
    if (!this.paypalHelper) {
      return;
    }
    const invoice = event.data.object as Stripe.Invoice;
    if (
      !(await this.stripeHelper.invoicePayableWithPaypal(invoice)) ||
      invoice.status !== 'draft'
    ) {
      return;
    }
    return this.stripeHelper.finalizeInvoice(invoice);
  }

  /**
   * Handle `invoice.paid` Stripe wehbook events.
   */
  async handleInvoicePaidEvent(request: AuthRequest, event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    try {
      await this.sendSubscriptionInvoiceEmail(invoice);
    } catch (err) {
      reportSentryError(err, request);
      return;
    }
  }

  /**
   * Handle `invoice.payment_failed` Stripe wehbook events.
   */
  async handleInvoicePaymentFailedEvent(
    request: AuthRequest,
    event: Stripe.Event
  ) {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.billing_reason !== 'subscription_cycle') {
      // Send payment failure emails only when processing a subscription renewal.
      return;
    }
    await this.sendSubscriptionPaymentFailedEmail(invoice);
  }

  /**
   * Handle `customer.source.expiring` Stripe wehbook events.
   */
  async handleCustomerSourceExpiringEvent(
    request: AuthRequest,
    event: Stripe.Event
  ) {
    const source = event.data.object as Stripe.Source;
    const { uid, email } = await this.sendSubscriptionPaymentExpiredEmail(
      source
    );
  }

  /**
   * Validate plan metadata and update cached plans.
   */
  async handlePlanCreatedOrUpdatedEvent(
    request: AuthRequest,
    event: Stripe.Event
  ) {
    const plan = event.data.object as Stripe.Plan;
    const product = await this.stripeHelper.fetchProductById(
      plan.product as string
    );
    const allPlans = await this.stripeHelper.allPlans();
    // remove the plan until we have validated its metadata
    const updatedList = allPlans.filter((p) => p.id !== plan.id);

    if (!product || product.deleted) {
      const msg = `handlePlanCreatedOrUpdatedEvent - product ${plan.product} appear to have been deleted`;
      this.log.error(msg, { plan });

      Sentry.withScope((scope) => {
        scope.setContext('planUpdatedEvent', { plan });
        Sentry.captureMessage(msg, Sentry.Severity.Error);
      });

      this.stripeHelper.updateAllPlans(updatedList);
      return;
    }

    const { error } = await subscriptionProductMetadataValidator.validateAsync({
      ...product.metadata,
      ...plan.metadata,
    });

    if (error) {
      const msg = formatMetadataValidationErrorMessage(plan.id, error as any);
      this.log.error(`handlePlanCreatedOrUpdatedEvent: ${msg}`, {
        error,
        plan,
      });
      reportValidationError(msg, error as any);
      this.stripeHelper.updateAllPlans(updatedList);
      return;
    }

    // The original plans list has the product expanded so we attach the
    // product object here.
    const updatedPlan = { ...plan, product };
    updatedList.push(updatedPlan);
    this.stripeHelper.updateAllPlans(updatedList);
  }

  async handlePlanDeletedEvent(request: AuthRequest, event: Stripe.Event) {
    const plan = event.data.object as Stripe.Plan;
    const allPlans = await this.stripeHelper.allPlans();
    this.stripeHelper.updateAllPlans(allPlans.filter((p) => p.id !== plan.id));
  }

  async handleTaxRateCreatedOrUpdatedEvent(
    request: AuthRequest,
    event: Stripe.Event
  ) {
    const taxRate = event.data.object as Stripe.TaxRate;
    const allTaxRates = await this.stripeHelper.allTaxRates();
    const updatedList = allTaxRates.filter((tr) => tr.id !== taxRate.id);
    updatedList.push(taxRate);
    this.stripeHelper.updateAllTaxRates(updatedList);
  }

  /**
   * Update products cache and validate metadata.
   */
  async handleProductWebhookEvent(request: AuthRequest, event: Stripe.Event) {
    const allProducts = await this.stripeHelper.allProducts();
    const product = event.data.object as Stripe.Product;
    const updatedList = allProducts.filter((p) => p.id !== product.id);
    updatedList.push(product);
    await this.stripeHelper.updateAllProducts(updatedList);

    const plans = await this.stripeHelper.fetchPlansByProductId(product.id);
    const allPlans = await this.stripeHelper.fetchAllPlans();
    const updatedPlans = allPlans.filter(
      (plan) => (plan.product as Stripe.Product).id !== product.id
    );

    if (event.type !== 'product.deleted') {
      for (const plan of plans) {
        const { error } =
          await subscriptionProductMetadataValidator.validateAsync({
            ...product.metadata,
            ...plan.metadata,
          });

        if (error) {
          const msg = formatMetadataValidationErrorMessage(
            plan.id,
            error as any
          );
          this.log.error(`handleProductWebhookEvent: ${msg}`, {
            error,
            product,
          });
          reportValidationError(msg, error as any);
        } else {
          updatedPlans.push({ ...plan, product });
        }
      }
    }

    this.stripeHelper.updateAllPlans(updatedPlans);
  }

  /**
   * Send out an email on payment expiration.
   */
  async sendSubscriptionPaymentExpiredEmail(paymentSource: Stripe.Source) {
    const sourceDetails = await this.stripeHelper.extractSourceDetailsForEmail(
      paymentSource
    );
    const { uid } = sourceDetails;
    const account = await this.db.account(uid);

    await this.mailer.sendSubscriptionPaymentExpiredEmail(
      account.emails,
      account,
      {
        acceptLanguage: account.locale,
        ...sourceDetails,
      }
    );

    return sourceDetails;
  }

  /**
   * Send out an email on payment failure.
   */
  async sendSubscriptionPaymentFailedEmail(invoice: Stripe.Invoice) {
    const invoiceDetails =
      await this.stripeHelper.extractInvoiceDetailsForEmail(invoice);
    const { uid } = invoiceDetails;
    const account = await this.db.account(uid);
    await this.mailer.sendSubscriptionPaymentFailedEmail(
      account.emails,
      account,
      {
        acceptLanguage: account.locale,
        ...invoiceDetails,
      }
    );
    await this.stripeHelper.updateEmailSent(invoice, 'paymentFailed');
    return invoiceDetails;
  }

  /**
   * Send out the appropriate invoice email, depending on whether it's the
   * initial or a subsequent invoice.
   */
  async sendSubscriptionInvoiceEmail(invoice: Stripe.Invoice) {
    const invoiceDetails =
      await this.stripeHelper.extractInvoiceDetailsForEmail(invoice);
    const { uid, invoiceSubtotalInCents, invoiceDiscountAmountInCents } =
      invoiceDetails;
    const account = await this.db.account(uid);
    const mailParams = [
      account.emails,
      account,
      {
        acceptLanguage: account.locale,
        ...invoiceDetails,
      },
    ];
    switch (invoice.billing_reason) {
      case 'subscription_create':
        if (invoiceSubtotalInCents && invoiceDiscountAmountInCents) {
          await this.mailer.sendSubscriptionFirstInvoiceDiscountEmail(
            ...mailParams
          );
        } else {
          await this.mailer.sendSubscriptionFirstInvoiceEmail(...mailParams);
        }

        // To not overwhelm users with emails, we only send download subscription email
        // for existing accounts. Passwordless accounts get their own email.
        if (account.verifierSetAt > 0) {
          await this.mailer.sendDownloadSubscriptionEmail(...mailParams);
        }
        break;
      default:
        // Other billing reasons should be covered in subsequent invoice email
        // https://stripe.com/docs/api/invoices/object#invoice_object-billing_reason
        await this.mailer.sendSubscriptionSubsequentInvoiceEmail(...mailParams);
        break;
    }
    return invoiceDetails;
  }

  /**
   * Send out the appropriate email on subscription update, depending on
   * whether the change was a subscription upgrade or downgrade.
   */
  async sendSubscriptionUpdatedEmail(event: Stripe.Event) {
    const eventDetails =
      await this.stripeHelper.extractSubscriptionUpdateEventDetailsForEmail(
        event
      );
    const { uid, email } = eventDetails;
    const account = await this.db.account(uid);

    const mailParams = [
      account.emails,
      account,
      {
        acceptLanguage: account.locale,
        ...eventDetails,
      },
    ];

    switch (eventDetails.updateType) {
      case SUBSCRIPTION_UPDATE_TYPES.UPGRADE:
        await this.mailer.sendSubscriptionUpgradeEmail(...mailParams);
        break;
      case SUBSCRIPTION_UPDATE_TYPES.DOWNGRADE:
        await this.mailer.sendSubscriptionDowngradeEmail(...mailParams);
        break;
      case SUBSCRIPTION_UPDATE_TYPES.REACTIVATION:
        await this.mailer.sendSubscriptionReactivationEmail(...mailParams);
        break;
      case SUBSCRIPTION_UPDATE_TYPES.CANCELLATION:
        await this.mailer.sendSubscriptionCancellationEmail(...mailParams);
        break;
    }

    return { uid, email };
  }

  /**
   * Send out the appropriate email on subscription deletion, depending on
   * whether the user still has an account.
   *
   * We receive a subscription deleted event for the following:
   *   1. A user canceled subscription.
   *   2. Subscription canceled after multiple Stripe attempts to pay an invoice.
   *   3. PayPal processor canceled the subscription after failed attempts.
   *   4. A user deleted their account.
   *   5. An admin or support agent cancelled the subscription.
   *
   * (1) and (5) are handled at the time of cancellation, so we do not send an additional
   * email here.
   */
  async sendSubscriptionDeletedEmail(subscription: Stripe.Subscription) {
    if (typeof subscription.latest_invoice !== 'string') {
      throw error.internalValidationError(
        'sendSubscriptionDeletedEmail',
        {
          subscriptionId: subscription.id,
          subscriptionInvoiceType: typeof subscription.latest_invoice,
        },
        'Subscription latest_invoice was not a string.'
      );
    }
    const invoice = await this.stripeHelper.expandResource<Stripe.Invoice>(
      subscription.latest_invoice,
      INVOICES_RESOURCE
    );
    const invoiceDetails =
      await this.stripeHelper.extractInvoiceDetailsForEmail(invoice);
    if (subscription.metadata?.cancelled_for_customer_at) {
      // Subscription already cancelled, should have triggered an email earlier
      return invoiceDetails;
    }
    const { uid, email } = invoiceDetails;

    let account;
    try {
      // If the user's account has not been deleted, we should have already
      // sent email at subscription update when cancel_at_period_end = true,
      // _or_ the cancellation is from Stripe due to failed retries or the
      // PayPal processor, which we'll handle here.
      account = await this.db.account(uid);
      await this.mailer.sendSubscriptionFailedPaymentsCancellationEmail(
        account.emails,
        account,
        {
          acceptLanguage: account.locale,
          ...invoiceDetails,
        }
      );
    } catch (err) {
      // Has the user's account been deleted?
      if (err.errno === error.ERRNO.ACCOUNT_UNKNOWN) {
        // HACK: Minimal account-like object that mailer should accept.
        // see also: lib/senders/index.js senders.email wrappedMailer
        account = { email, uid, emails: [{ email, isPrimary: true }] };

        await this.mailer.sendSubscriptionAccountDeletionEmail(
          account.emails,
          account,
          {
            // TODO: How do we retain account.locale on deletion? Save in customer metadata?
            // acceptLanguage: account.locale,
            ...invoiceDetails,
          }
        );
      }
    }

    return invoiceDetails;
  }
}

export const stripeWebhookRoutes = (
  log: AuthLogger,
  db: any,
  config: ConfigType,
  customs: any,
  push: any,
  mailer: any,
  profile: any,
  stripeHelper: StripeHelper
): ServerRoute[] => {
  const stripeWebhookHandler = new StripeWebhookHandler(
    log,
    db,
    config,
    customs,
    push,
    mailer,
    profile,
    stripeHelper
  );

  // FIXME: All of these need to be wrapped in Stripe error handling
  // FIXME: Many of these stripe calls need retries with careful thought about
  //        overall request deadline. Stripe retries must include a idempotency_key.
  return [
    {
      method: 'POST',
      path: '/oauth/subscriptions/stripe/event',
      options: {
        // We'll use the official Stripe library to authenticate the payload,
        // and it will also return an event.
        auth: false,
        // The raw payload is needed for authentication.
        payload: {
          output: 'data',
          parse: false,
          // Stripe event bodies can be pretty large, the server defaults to 1MB.
          maxBytes: config.subscriptions.stripeWebhookPayloadLimit,
        },
        validate: {
          headers: { 'stripe-signature': isA.string().required() },
        },
      },
      handler: (request: AuthRequest) =>
        stripeWebhookHandler.handleWebhookEvent(request),
    },
  ];
};
