/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// AUTOGENERATED BY glean_parser v14.2.0. DO NOT EDIT. DO NOT COMMIT.

import EventMetricType from '@mozilla/glean/private/metrics/event';

/**
 * User clicked Apple Signin link from an RP hosted site and is taken
 * directly to Apple authentication flow, bypassing Mozilla Accounts email
 * first page.
 *
 * Generated from `third_party_auth.apple_deeplink`.
 */
export const appleDeeplink = new EventMetricType(
  {
    category: 'third_party_auth',
    name: 'apple_deeplink',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * User click "Continue with Apple" from the login page
 *
 * Generated from `third_party_auth.apple_login_start`.
 */
export const appleLoginStart = new EventMetricType(
  {
    category: 'third_party_auth',
    name: 'apple_login_start',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * User clicks on the Apple third party link on the registration page.
 *
 * Generated from `third_party_auth.apple_reg_start`.
 */
export const appleRegStart = new EventMetricType(
  {
    category: 'third_party_auth',
    name: 'apple_reg_start',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * User clicked Google Signin link from an RP hosted site and is taken
 * directly to Google authentication flow, bypassing Mozilla Accounts email
 * first page.
 *
 * Generated from `third_party_auth.google_deeplink`.
 */
export const googleDeeplink = new EventMetricType(
  {
    category: 'third_party_auth',
    name: 'google_deeplink',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * User click "Continue with Google" from the login page
 *
 * Generated from `third_party_auth.google_login_start`.
 */
export const googleLoginStart = new EventMetricType(
  {
    category: 'third_party_auth',
    name: 'google_login_start',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * User clicks on the Google third party link on the registration page.
 *
 * Generated from `third_party_auth.google_reg_start`.
 */
export const googleRegStart = new EventMetricType(
  {
    category: 'third_party_auth',
    name: 'google_reg_start',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * User viewed the third party login page without password set.
 *
 * Generated from `third_party_auth.login_no_pw_view`.
 */
export const loginNoPwView = new EventMetricType(
  {
    category: 'third_party_auth',
    name: 'login_no_pw_view',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);
