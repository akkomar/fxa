/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { expect, test } from '../../lib/fixtures/standard';

test.describe('severity-1 #smoke', () => {
  test('signin to sync and disconnect', async ({
    target,
    syncBrowserPages: { page, login, settings },
    testAccountTracker,
  }) => {
    const credentials = await testAccountTracker.signUp();

    await page.goto(
      target.contentServerUrl +
        '?context=fx_desktop_v3&entrypoint=fxa%3Aenter_email&service=sync&action=email'
    );
    await login.login(credentials.email, credentials.password);

    await expect(login.isSyncConnectedHeader()).toBeVisible({ timeout: 1000 });

    await settings.disconnectSync(credentials);

    // confirm left settings and back at sign in
    await page.waitForURL('**/signin', { timeout: 1000 });
  });

  test('disconnect RP', async ({
    pages: { relier, login, settings },
    testAccountTracker,
  }) => {
    const credentials = await testAccountTracker.signUp();

    await relier.goto();
    await relier.clickEmailFirst();
    await login.login(credentials.email, credentials.password);

    expect(await relier.isLoggedIn()).toBe(true);

    // Login to settings with cached creds
    await settings.goto();
    let services = await settings.connectedServices.services();

    expect(services.length).toEqual(3);

    // Sign out of 123Done
    const rp = services.find((service) => service.name.includes('123'));
    await rp?.signout();

    await expect(settings.alertBar).toBeVisible();

    services = await settings.connectedServices.services();

    expect(services.length).toEqual(2);
  });
});
