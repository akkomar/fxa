/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { FirefoxCommand } from '../../lib/channels';
import { expect, test } from '../../lib/fixtures/standard';

const makeUid = () =>
  [...Array(32)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('');

test.describe('severity-1 #smoke', () => {
  test.describe('Desktop Sync V3 force auth', () => {
    test('sync v3 with an unregistered email, no uid', async ({
      pages: { configPage },
      syncBrowserPages: { fxDesktopV3ForceAuth, login },
      testAccountTracker,
    }) => {
      const config = await configPage.getConfig();
      test.skip(
        config.showReactApp.signUpRoutes === true,
        'force_auth is no longer supported for signup with react, FXA-9410'
      );

      const credentials = await testAccountTracker.signUpSync();
      const email = testAccountTracker.generateSyncEmail();

      await fxDesktopV3ForceAuth.openWithReplacementParams(credentials, {
        email,
        uid: undefined,
      });
      const error = await login.signInError();
      expect(error).toContain('Recreate');
      const emailInputValue = await login.getEmailInput();
      expect(emailInputValue).toBe(email);
      const emailInput = await login.getEmailInputElement();
      await expect(emailInput).toBeDisabled();
      expect(await (await login.getUseDifferentAccountLink()).count()).toEqual(
        0
      );
      await login.fillOutFirstSignUp(email, credentials.password, {
        enterEmail: false,
      });
      await fxDesktopV3ForceAuth.checkWebChannelMessage(
        FirefoxCommand.LinkAccount
      );
      await fxDesktopV3ForceAuth.checkWebChannelMessage(FirefoxCommand.Login);
    });

    test('sync v3 with an unregistered email, registered uid', async ({
      pages: { configPage },
      syncBrowserPages: { fxDesktopV3ForceAuth, login },
      testAccountTracker,
    }) => {
      const config = await configPage.getConfig();
      test.skip(
        config.showReactApp.signUpRoutes === true,
        'force_auth is no longer supported for signup with react, FXA-9410'
      );

      const credentials = await testAccountTracker.signUpSync();
      const email = testAccountTracker.generateSyncEmail();

      await fxDesktopV3ForceAuth.openWithReplacementParams(credentials, {
        email,
      });
      const error = await login.signInError();
      expect(error).toContain('Recreate');
      const emailInputValue = await login.getEmailInput();
      expect(emailInputValue).toBe(email);
      const emailInput = await login.getEmailInputElement();
      await expect(emailInput).toBeDisabled();
      expect(await (await login.getUseDifferentAccountLink()).count()).toEqual(
        0
      );
    });

    test('sync v3 with an unregistered email, unregistered uid', async ({
      pages: { configPage },
      syncBrowserPages: { fxDesktopV3ForceAuth, login },
      testAccountTracker,
    }) => {
      const config = await configPage.getConfig();
      test.skip(
        config.showReactApp.signUpRoutes === true,
        'force_auth is no longer supported for signup with react, FXA-9410'
      );

      const credentials = await testAccountTracker.signUpSync();
      const email = testAccountTracker.generateSyncEmail();
      const uid = makeUid();
      await fxDesktopV3ForceAuth.openWithReplacementParams(credentials, {
        email,
        uid,
      });
      const error = await login.signInError();
      expect(error).toContain('Recreate');
      const emailInputValue = await login.getEmailInput();
      expect(emailInputValue).toBe(email);
      const emailInput = await login.getEmailInputElement();
      await expect(emailInput).toBeDisabled();
      expect(await (await login.getUseDifferentAccountLink()).count()).toEqual(
        0
      );
    });
  });
});
