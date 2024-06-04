/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { EmailHeader, EmailType } from '../../../lib/email';
import { expect, test } from '../../../lib/fixtures/standard';

test.describe('severity-1 #smoke', () => {
  test.describe('Firefox Desktop Sync v3 reset password react', () => {
    test.beforeEach(async ({ pages: { configPage } }) => {
      const config = await configPage.getConfig();
      test.skip(
        config.featureFlags.resetPasswordWithCode === true,
        'see FXA-9728, remove these tests'
      );
    });

    test('reset pw for sync user', async ({
      target,
      syncBrowserPages: { page, resetPasswordReact },
      testAccountTracker,
    }) => {
      const credentials = await testAccountTracker.signUp();
      const newPassword = testAccountTracker.generatePassword();

      await resetPasswordReact.goto(
        undefined,
        'context=fx_desktop_v3&service=sync'
      );

      // Check that the sync relier is in the heading
      await expect(resetPasswordReact.resetPasswordHeading).toHaveText(
        /Firefox Sync/
      );

      await resetPasswordReact.fillOutEmailForm(credentials.email);

      const link = await target.emailClient.waitForEmail(
        credentials.email,
        EmailType.recovery,
        EmailHeader.link
      );
      await page.goto(link);

      await resetPasswordReact.fillOutNewPasswordForm(newPassword);
      // Update credentials file so that account can be deleted as part of test cleanup
      credentials.password = newPassword;

      await expect(page).toHaveURL(/reset_password_verified/);
      await expect(
        resetPasswordReact.passwordResetConfirmationHeading
      ).toBeVisible();
    });
  });
});
