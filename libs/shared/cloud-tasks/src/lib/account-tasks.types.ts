/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CloudTasksConfig } from './cloud-tasks.types';

/** Represents config specific for running cloud tasks */
export type DeleteAccountCloudTaskConfig = CloudTasksConfig & {
  cloudTasks: {
    deleteAccounts: {
      taskUrl: string;
      queueName: string;
    };
  };
};

/** Reasons an account can be deleted. */
export enum ReasonForDeletion {
  UserRequested = 'fxa_user_requested_account_delete',
  Unverified = 'fxa_unverified_account_delete',
  Cleanup = 'fxa_cleanup_account_delete',
}

/** Task payload requesting an account deletion */
export type DeleteAccountTask = {
  /** The account id */
  uid: string;
  /** The customer id, i.e. a stripe customer id if applicable */
  customerId: string | undefined;
  /** Reason for deletion */
  reason: ReasonForDeletion;
};
