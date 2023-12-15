/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  EligibilityContentByPlanIdsResult,
  EligibilityOfferingResult,
  EligibilityPurchaseResult,
} from './types';

export class EligibilityContentByPlanIdsResultUtil {
  private purchaseByPlanId: Record<string, EligibilityPurchaseResult> = {};

  constructor(private rawResult: EligibilityContentByPlanIdsResult) {
    for (const purchase of rawResult.purchaseCollection.items) {
      purchase.stripePlanChoices?.forEach((planId) => {
        this.purchaseByPlanId[planId] = purchase;
      });

      purchase.offering.stripeLegacyPlans?.forEach((planId) => {
        this.purchaseByPlanId[planId] = purchase;
      });
    }
  }

  offeringForPlanId(planId: string): EligibilityOfferingResult | undefined {
    return this.purchaseByPlanId[planId]?.offering;
  }

  get purchaseCollection() {
    return this.rawResult.purchaseCollection;
  }
}
