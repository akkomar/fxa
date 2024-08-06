/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Injectable } from '@nestjs/common';

import { PayPalClient } from './paypal.client';

@Injectable()
export class CheckoutTokenManager {
  constructor(private client: PayPalClient) {}

  /**
   * Get a token authorizing transaction to move to the next stage.
   * If the call to PayPal fails, a PayPalClientError will be thrown.
   */
  async get(currencyCode: string) {
    const response = await this.client.setExpressCheckout({ currencyCode });
    return response.TOKEN;
  }
}
