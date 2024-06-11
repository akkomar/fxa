/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import got from 'got';

function wait() {
  return new Promise((r) => setTimeout(r, 50));
}

function toUsername(emailAddress: string) {
  return emailAddress.split('@')[0];
}

export enum EmailType {
  subscriptionReactivation,
  subscriptionUpgrade,
  subscriptionDowngrade,
  subscriptionPaymentExpired,
  subscriptionsPaymentExpired,
  subscriptionPaymentProviderCancelled,
  subscriptionsPaymentProviderCancelled,
  subscriptionPaymentFailed,
  subscriptionAccountDeletion,
  subscriptionCancellation,
  subscriptionSubsequentInvoice,
  subscriptionFirstInvoice,
  downloadSubscription,
  fraudulentAccountDeletion,
  lowRecoveryCodes,
  newDeviceLogin,
  passwordChanged,
  passwordChangeRequired,
  passwordForgotOtp,
  passwordReset,
  passwordResetAccountRecovery,
  passwordResetRequired,
  postAddLinkedAccount,
  postChangePrimary,
  postRemoveSecondary,
  postVerify,
  postVerifySecondary,
  postAddTwoStepAuthentication,
  postRemoveTwoStepAuthentication,
  postAddAccountRecovery,
  postRemoveAccountRecovery,
  postConsumeRecoveryCode,
  postNewRecoveryCodes,
  recovery,
  unblockCode,
  verify,
  verifySecondaryCode,
  verifyShortCode,
  verifyLogin,
  verifyLoginCode,
  verifyPrimary,
  verificationReminderFirst,
  verificationReminderSecond,
  verificationReminderFinal,
  cadReminderFirst,
  cadReminderSecond,
}

export enum EmailHeader {
  verifyCode = 'x-verify-code',
  shortCode = 'x-verify-short-code',
  unblockCode = 'x-unblock-code',
  signinCode = 'x-signin-verify-code',
  recoveryCode = 'x-recovery-code',
  uid = 'x-uid',
  serviceId = 'x-service-id',
  link = 'x-link',
  templateName = 'x-template-name',
  templateVersion = 'x-template-version',
  resetPasswordCode = 'x-password-forgot-otp',
}

export class EmailClient {
  constructor(private readonly host: string = 'http://restmail.net') {}

  async waitForEmail(
    emailAddress: string,
    type: EmailType,
    header?: EmailHeader,
    timeout = 45000
  ) {
    const expires = Date.now() + timeout;
    while (Date.now() < expires) {
      const mail = (await got(
        `${this.host}/mail/${toUsername(emailAddress)}`
      ).json()) as any[];
      const msg = mail
        .reverse()
        .find((m) => m.headers[EmailHeader.templateName] === EmailType[type]);
      if (msg) {
        return header ? msg.headers[header] : msg;
      }
      await wait();
    }
    throw new Error('EmailTimeout');
  }

  async clear(emailAddress: string) {
    await got.delete(`${this.host}/mail/${toUsername(emailAddress)}`);
  }

  async getLowRecoveryLink(email: string): Promise<string> {
    const link = await this.waitForEmail(
      email,
      EmailType.lowRecoveryCodes,
      EmailHeader.link
    );
    await this.clear(email);
    return link;
  }

  async getRecoveryLink(email: string): Promise<string> {
    const link = await this.waitForEmail(
      email,
      EmailType.recovery,
      EmailHeader.link
    );
    await this.clear(email);
    return link;
  }

  async getResetPasswordCode(email: string): Promise<string> {
    const code = await this.waitForEmail(
      email,
      EmailType.passwordForgotOtp,
      EmailHeader.resetPasswordCode
    );
    await this.clear(email);
    return code;
  }

  async getVerifyCode(email: string): Promise<string> {
    const code = await this.waitForEmail(
      email,
      EmailType.verify,
      EmailHeader.verifyCode
    );
    await this.clear(email);
    return code;
  }

  async getVerifyLoginCode(email: string): Promise<string> {
    const code = await this.waitForEmail(
      email,
      EmailType.verifyLoginCode,
      EmailHeader.signinCode
    );
    await this.clear(email);
    return code;
  }

  async getVerifySecondCode(email: string): Promise<string> {
    const code = await this.waitForEmail(
      email,
      EmailType.verifySecondaryCode,
      EmailHeader.verifyCode
    );
    await this.clear(email);
    return code;
  }

  async getVerifyShortCode(email: string): Promise<string> {
    const code = await this.waitForEmail(
      email,
      EmailType.verifyShortCode,
      EmailHeader.shortCode
    );
    await this.clear(email);
    return code;
  }

  async getUnblockCode(email: string): Promise<string> {
    const code = await this.waitForEmail(
      email,
      EmailType.unblockCode,
      EmailHeader.unblockCode
    );
    await this.clear(email);
    return code;
  }
}
