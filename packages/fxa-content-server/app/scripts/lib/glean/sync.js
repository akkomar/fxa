/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// AUTOGENERATED BY glean_parser v14.1.3. DO NOT EDIT. DO NOT COMMIT.

import LabeledMetricType from '@mozilla/glean/private/metrics/labeled';
import BooleanMetricType from '@mozilla/glean/private/metrics/boolean';

/**
 * The set of Sync engine options at the time of an account sign up via
 * Sync.  For example, if the user only opted into syncing their Firefox
 * bookmarks and history, then "bookmarks" and "history" will have true for
 * their values, while the rest of the labels will have false.
 *
 * Generated from `sync.cwts`.
 */
export const cwts = new LabeledMetricType(
  {
    category: 'sync',
    name: 'cwts',
    sendInPings: ['accounts-events', 'events'],
    lifetime: 'application',
    disabled: false,
  },
  BooleanMetricType,
  [
    'addons',
    'addresses',
    'bookmarks',
    'creditcards',
    'history',
    'passwords',
    'prefs',
    'tabs',
  ]
);
