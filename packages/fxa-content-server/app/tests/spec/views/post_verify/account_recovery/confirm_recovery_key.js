/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import _ from 'underscore';
import { assert } from 'chai';
import Account from 'models/account';
import AuthErrors from 'lib/auth-errors';
import Backbone from 'backbone';
import BaseBroker from 'models/auth_brokers/base';
import Metrics from 'lib/metrics';
import Relier from 'models/reliers/relier';
import SentryMetrics from 'lib/sentry';
import sinon from 'sinon';
import User from 'models/user';
import View from 'views/post_verify/account_recovery/confirm_recovery_key';
import WindowMock from '../../../../mocks/window';
import $ from 'jquery';

const RECOVERY_KEY = 'SOMEKEY';
const RECOVERY_KEY_ID = 'SOMEKEYID';

describe('views/post_verify/account_recovery/confirm_recovery_key', () => {
  let account;
  let broker;
  let metrics;
  let model;
  let notifier;
  let relier;
  let sentryMetrics;
  let user;
  let view;
  let windowMock;

  beforeEach(() => {
    windowMock = new WindowMock();
    relier = new Relier({
      window: windowMock,
    });
    broker = new BaseBroker({
      relier,
      window: windowMock,
    });
    account = new Account({
      email: 'a@a.com',
      uid: 'uid',
    });
    model = new Backbone.Model({
      account,
      recoveryKey: RECOVERY_KEY,
      recoveryKeyId: RECOVERY_KEY_ID,
    });
    notifier = _.extend({}, Backbone.Events);
    sentryMetrics = new SentryMetrics();
    metrics = new Metrics({ notifier, sentryMetrics });
    user = new User();
    view = new View({
      broker,
      metrics,
      model,
      notifier,
      relier,
      user,
    });

    sinon.stub(view, 'getSignedInAccount').callsFake(() => account);
    sinon.stub(account, 'checkRecoveryKeyExists').callsFake(() =>
      Promise.resolve({
        exists: false,
      })
    );

    return view.render().then(() => $('#container').html(view.$el));
  });

  afterEach(function () {
    metrics.destroy();
    view.remove();
    view.destroy();
  });

  describe('render', () => {
    it('renders the view', () => {
      assert.lengthOf(view.$('#fxa-confirm-recovery-key-header'), 1);
      assert.lengthOf(view.$('.graphic-recovery-codes'), 1);
      assert.lengthOf(view.$('#recovery-key'), 1);
      assert.lengthOf(view.$('#submit-btn'), 1);
      assert.lengthOf(view.$('#back-btn'), 1);
    });

    describe('without an account', () => {
      beforeEach(() => {
        account = new Account({});
        sinon.spy(view, 'navigate');
        return view.render();
      });

      it('redirects to the email first page', () => {
        assert.isTrue(view.navigate.calledWith('/'));
      });
    });

    describe('without an account recovery key', () => {
      beforeEach(() => {
        model.unset('recoveryKey');
        model.unset('recoveryKeyId');
        sinon.spy(view, 'navigate');
        return view.render();
      });

      it('redirects to add account recovery key view', () => {
        assert.isTrue(
          view.navigate.calledWith(
            '/post_verify/account_recovery/add_recovery_key'
          )
        );
      });
    });
  });

  describe('click back', () => {
    beforeEach(() => {
      sinon.spy(view, 'navigate');
      return view.clickBack();
    });

    it('redirects to save account recovery key view', () => {
      assert.isTrue(
        view.navigate.calledWith(
          '/post_verify/account_recovery/save_recovery_key',
          {
            recoveryKey: RECOVERY_KEY,
            recoveryKeyId: RECOVERY_KEY_ID,
          }
        )
      );
    });
  });

  describe('submit', () => {
    describe('success', () => {
      beforeEach(() => {
        sinon
          .stub(account, 'verifyRecoveryKey')
          .callsFake(() => Promise.resolve({}));
        sinon.spy(view, 'navigate');
        view.$('#recovery-key').val(RECOVERY_KEY);
        return view.submit();
      });

      it('redirects to verified account recovery key view', () => {
        assert.isTrue(
          view.navigate.calledWith(
            '/post_verify/account_recovery/verified_recovery_key'
          )
        );
      });
    });

    describe('errors', () => {
      let error;

      describe('with mismatch account recovery key', () => {
        beforeEach(() => {
          sinon.spy(view, 'showValidationError');
          error = AuthErrors.toError('INVALID_RECOVERY_KEY');
          view.$('#recovery-key').val('THISKEYISNOTVALID');
          return view.submit();
        });

        it('should show validation tooltip', () => {
          assert.equal(view.showValidationError.args.length, 1);
          const args = view.showValidationError.args[0];
          assert.deepEqual(args[0], view.$('#recovery-key'));
          assert.equal(
            args[1].errno,
            159,
            'throws invalid account recovery key error'
          );
        });
      });

      describe('other errors', () => {
        beforeEach(() => {
          error = AuthErrors.toError('UNEXPECTED_ERROR');
          sinon
            .stub(account, 'verifyRecoveryKey')
            .callsFake(() => Promise.reject(error));
          view.$('#recovery-key').val(RECOVERY_KEY);
        });

        it('should throw and handle in lower level', () => {
          return view.submit().then(assert.fail, (err) => {
            assert.equal(err, error);
          });
        });
      });
    });
  });
});
