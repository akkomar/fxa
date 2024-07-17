/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// AUTOGENERATED BY glean_parser v14.1.3. DO NOT EDIT. DO NOT COMMIT.

import EventMetricType from '@mozilla/glean/private/metrics/event';

/**
 * Reset Password Create New Password See Recovery Key Question Click
 * User clicks the button for "reset your password with your recovery key"'
 *
 * Generated from `password_reset.create_new_recovery_key_message_click`.
 */
export const createNewRecoveryKeyMessageClick = new EventMetricType(
  {
    category: 'password_reset',
    name: 'create_new_recovery_key_message_click',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Create New Password Submit
 * User attemps to submit the create new password form'
 *
 * Generated from `password_reset.create_new_submit`.
 */
export const createNewSubmit = new EventMetricType(
  {
    category: 'password_reset',
    name: 'create_new_submit',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Create New Password Success (FE)
 * View of the "Your Password has been reset" page'
 *
 * Generated from `password_reset.create_new_success_view`.
 */
export const createNewSuccessView = new EventMetricType(
  {
    category: 'password_reset',
    name: 'create_new_success_view',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Create New Password View
 * View of the create new password form (from the Forgot Password link)'
 *
 * Generated from `password_reset.create_new_view`.
 */
export const createNewView = new EventMetricType(
  {
    category: 'password_reset',
    name: 'create_new_view',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Forgot Password Confirmation Code Use a different account
 * User clicks the "use a different account" button on the "Enter Confirmation
 * Code" screen'
 *
 * Generated from `password_reset.email_confirmation_different_account`.
 */
export const emailConfirmationDifferentAccount = new EventMetricType(
  {
    category: 'password_reset',
    name: 'email_confirmation_different_account',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Forgot Password Confirmation Code Resend
 * User clicks the "resend code" button on the "Enter Confirmation Code" screen'
 *
 * Generated from `password_reset.email_confirmation_resend_code`.
 */
export const emailConfirmationResendCode = new EventMetricType(
  {
    category: 'password_reset',
    name: 'email_confirmation_resend_code',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Forgot Password Confirmation Code Sign In
 * User clicks the "sign in" button on the "Enter Confirmation Code" screen'
 *
 * Generated from `password_reset.email_confirmation_signin`.
 */
export const emailConfirmationSignin = new EventMetricType(
  {
    category: 'password_reset',
    name: 'email_confirmation_signin',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Forgot Password Confirmation Code Submit
 * User clicks the "Continue" button on the "Enter Confirmation Code" screen'
 *
 * Generated from `password_reset.email_confirmation_submit`.
 */
export const emailConfirmationSubmit = new EventMetricType(
  {
    category: 'password_reset',
    name: 'email_confirmation_submit',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Forgot Password Confirmation Code View
 * User views the "Enter Confirmation Code" screen'
 *
 * Generated from `password_reset.email_confirmation_view`.
 */
export const emailConfirmationView = new EventMetricType(
  {
    category: 'password_reset',
    name: 'email_confirmation_view',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Reset Password Can't Find Key
 * User clicks the "Can't find your account recovery key?" button on the confirm
 * reccovery key page'
 *
 * Generated from `password_reset.recovery_key_cannot_find`.
 */
export const recoveryKeyCannotFind = new EventMetricType(
  {
    category: 'password_reset',
    name: 'recovery_key_cannot_find',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Forgot Password w/ Recovery Key Create New Password Submit
 * User attempts to submit the create new password form'
 *
 * Generated from `password_reset.recovery_key_create_new_submit`.
 */
export const recoveryKeyCreateNewSubmit = new EventMetricType(
  {
    category: 'password_reset',
    name: 'recovery_key_create_new_submit',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Forgot Password Recovery Key Create New Password View
 * A view of the form to change the account password, viewable after submitting
 * a valid recovery key'
 *
 * Generated from `password_reset.recovery_key_create_new_view`.
 */
export const recoveryKeyCreateNewView = new EventMetricType(
  {
    category: 'password_reset',
    name: 'recovery_key_create_new_view',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Forgot Password w/ Recovery Key Create New Password Success (FE)
 * User successfully submits a new password and views the "your password has
 * been reset" page'
 *
 * Generated from `password_reset.recovery_key_create_success_view`.
 */
export const recoveryKeyCreateSuccessView = new EventMetricType(
  {
    category: 'password_reset',
    name: 'recovery_key_create_success_view',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Forgot Password Confirm Recovery Key Submit
 * Submit the form of recovery key for forgot password flow.'
 *
 * Generated from `password_reset.recovery_key_submit`.
 */
export const recoveryKeySubmit = new EventMetricType(
  {
    category: 'password_reset',
    name: 'recovery_key_submit',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Forgot Password Confirm Recovery Key View
 * A view of the form to confirm recovery key through the forgot password form.'
 *
 * Generated from `password_reset.recovery_key_view`.
 */
export const recoveryKeyView = new EventMetricType(
  {
    category: 'password_reset',
    name: 'recovery_key_view',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Create New Password Submit
 * Submit the create new password form'
 *
 * Generated from `password_reset.submit`.
 */
export const submit = new EventMetricType(
  {
    category: 'password_reset',
    name: 'submit',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);

/**
 * Password Reset View
 * View of the form asking the user to confirm that they want to reset.'
 *
 * Generated from `password_reset.view`.
 */
export const view = new EventMetricType(
  {
    category: 'password_reset',
    name: 'view',
    sendInPings: ['events'],
    lifetime: 'ping',
    disabled: false,
  },
  []
);
