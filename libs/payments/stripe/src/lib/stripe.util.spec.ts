/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  StripeApiListFactory,
  StripeResponseFactory,
} from './factories/api-list.factory';
import { StripeCouponFactory } from './factories/coupon.factory';
import { StripePriceFactory } from './factories/price.factory';
import { StripeProductFactory } from './factories/product.factory';
import { StripePromotionCodeFactory } from './factories/promotion-code.factory';
import {
  StripeSubscriptionFactory,
  StripeSubscriptionItemFactory,
} from './factories/subscription.factory';
import { PromotionCodeCouldNotBeAttachedError } from './stripe.error';
import { STRIPE_PRICE_METADATA, STRIPE_PRODUCT_METADATA } from './stripe.types';
import {
  checkSubscriptionPromotionCodes,
  checkValidPromotionCode,
  getSubscribedPrice,
  getSubscribedPrices,
  getSubscribedProductIds,
} from './stripe.util';

describe('util', () => {
  describe('checkSubscriptionPromotionCodes', () => {
    it('throws error if promotion code is not within subscription price', async () => {
      const mockPrice = StripePriceFactory();
      const mockPromoCode = StripePromotionCodeFactory();

      expect(() =>
        checkSubscriptionPromotionCodes(mockPromoCode, mockPrice, undefined)
      ).toThrowError(PromotionCodeCouldNotBeAttachedError);
    });

    it('returns true if only subscription price provided', async () => {
      const mockPromoCode = StripePromotionCodeFactory({
        code: 'promo_code1',
      });
      const mockPrice = StripePriceFactory({
        metadata: {
          [STRIPE_PRICE_METADATA.PROMOTION_CODES]:
            'promo_code1,promo_code2,promo_code3',
        },
      });

      const result = checkSubscriptionPromotionCodes(
        mockPromoCode,
        mockPrice,
        undefined
      );
      expect(result).toEqual(true);
    });

    it('returns true if promotion code is included in promotion codes for product', async () => {
      const mockPrice = StripePriceFactory({
        metadata: {
          [STRIPE_PRICE_METADATA.PROMOTION_CODES]:
            'promo_code1,promo_code2,promo_code3',
        },
      });
      const mockProduct = StripeProductFactory({
        metadata: {
          [STRIPE_PRODUCT_METADATA.PROMOTION_CODES]:
            'promo_code1,promo_code2,promo_code3',
        },
      });
      const mockPromoCode = StripePromotionCodeFactory({
        code: 'promo_code1',
      });

      const result = checkSubscriptionPromotionCodes(
        mockPromoCode,
        mockPrice,
        mockProduct
      );
      expect(result).toEqual(true);
    });
  });

  describe('checkValidPromotion', () => {
    it('throws error if there is no promotion code', async () => {
      const mockPromotionCode = StripeResponseFactory(undefined);

      expect(() => checkValidPromotionCode(mockPromotionCode)).toThrowError(
        PromotionCodeCouldNotBeAttachedError
      );
    });

    it('throws error if the promotion code is not active', async () => {
      const mockPromotionCode = StripePromotionCodeFactory({
        active: false,
      });

      expect(() => checkValidPromotionCode(mockPromotionCode)).toThrowError(
        PromotionCodeCouldNotBeAttachedError
      );
    });

    it('throws error if the promotion code coupon is not valid', async () => {
      const mockPromotionCode = StripePromotionCodeFactory({
        coupon: StripeCouponFactory({
          valid: false,
        }),
      });

      expect(() => checkValidPromotionCode(mockPromotionCode)).toThrowError(
        PromotionCodeCouldNotBeAttachedError
      );
    });

    it('throws error if the promotion code is expired', async () => {
      const expiredTime = Date.now() / 1000 - 50;
      const mockPromotionCode = StripePromotionCodeFactory({
        expires_at: expiredTime,
      });

      expect(() => checkValidPromotionCode(mockPromotionCode)).toThrowError(
        PromotionCodeCouldNotBeAttachedError
      );
    });

    it('returns true if the promotion code is valid', async () => {
      const mockPromotionCode = StripePromotionCodeFactory({
        active: true,
      });

      const result = checkValidPromotionCode(mockPromotionCode);
      expect(result).toEqual(true);
    });
  });

  describe('getSubscribedPrice', () => {
    it('returns subscription price successfully', async () => {
      const mockPrice = StripePriceFactory();
      const mockSubItem = StripeSubscriptionItemFactory({
        price: mockPrice,
      });
      const mockSubscription = StripeSubscriptionFactory({
        items: StripeApiListFactory([mockSubItem]),
      });

      const result = getSubscribedPrice(mockSubscription);
      expect(result).toEqual(mockPrice);
    });

    it('throws error if no subscription price exists', async () => {
      const mockSubscription = StripeSubscriptionFactory({
        items: StripeApiListFactory([]),
      });

      expect(() => getSubscribedPrice(mockSubscription)).toThrowError(
        PromotionCodeCouldNotBeAttachedError
      );
    });

    it('throws error if multiple subscription prices exists', async () => {
      const mockSubItem1 = StripeSubscriptionItemFactory();
      const mockSubItem2 = StripeSubscriptionItemFactory();
      const mockSubscription = StripeSubscriptionFactory({
        items: StripeApiListFactory([mockSubItem1, mockSubItem2]),
      });

      expect(() => getSubscribedPrice(mockSubscription)).toThrowError(
        PromotionCodeCouldNotBeAttachedError
      );
    });
  });

  describe('getSubscribedPrices', () => {
    it('returns prices successfully', async () => {
      const mockPrice = StripePriceFactory();
      const mockSubItem = StripeSubscriptionItemFactory({
        price: mockPrice,
      });
      const mockSubscription = StripeSubscriptionFactory({
        items: StripeApiListFactory([mockSubItem]),
      });

      const result = getSubscribedPrices([mockSubscription]);
      expect(result).toEqual([mockPrice]);
    });

    it('returns empty array if no subscriptions exist', async () => {
      const result = getSubscribedPrices([]);
      expect(result).toEqual([]);
    });
  });

  describe('getSubscribedProductIds', () => {
    it('returns product IDs successfully', async () => {
      const mockProductId = 'prod_test1';
      const mockPrice = StripePriceFactory({
        product: mockProductId,
      });

      const result = getSubscribedProductIds([mockPrice]);
      expect(result).toEqual([mockProductId]);
    });

    it('returns empty array if no subscriptions exist', async () => {
      const result = getSubscribedProductIds([]);
      expect(result).toEqual([]);
    });
  });
});
