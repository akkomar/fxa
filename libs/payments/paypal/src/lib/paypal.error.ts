/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
import { BaseError, BaseMultiError } from '@fxa/shared/error';
import { NVPErrorResponse } from './paypal.client.types';

export class PayPalClientError extends BaseMultiError {
  public raw: string;
  public data: NVPErrorResponse;

  constructor(errors: PayPalNVPError[], raw: string, data: NVPErrorResponse) {
    super(errors);
    this.name = 'PayPalClientError';
    this.raw = raw;
    this.data = data;
  }

  getPrimaryError(): PayPalNVPError {
    // TS is not picking up the type otherwise, so have to cast.
    return this.errors()[0] as PayPalNVPError;
  }

  static hasPayPalNVPError(err: Error | PayPalClientError): boolean {
    return (
      err instanceof PayPalClientError &&
      err.getPrimaryError() instanceof PayPalNVPError
    );
  }
}

export class PayPalNVPError extends BaseError {
  public raw: string;
  public data: NVPErrorResponse;
  public errorCode: number;

  constructor(raw: string, data: NVPErrorResponse, params: any) {
    const { message, cause, errorCode } = params;
    super(message, {
      name: 'PayPalNVPError',
      cause,
      info: {
        raw,
        data,
        errorCode,
      },
    });
    this.raw = raw;
    this.data = data;
    this.errorCode = errorCode;
  }
}

export class PaypalBillingAgreementManagerError extends BaseError {
  constructor(...args: ConstructorParameters<typeof BaseError>) {
    super(...args);
  }
}

export class AmountExceedsPayPalCharLimitError extends PaypalBillingAgreementManagerError {
  constructor(amountInCents: number) {
    super('Amount must be less than 10 characters', {
      info: {
        amountInCents,
      },
    });
  }
}
