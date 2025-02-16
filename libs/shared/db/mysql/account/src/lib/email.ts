/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
import { BaseModel } from './base';

export class Email extends BaseModel {
  static tableName = 'emails';
  static idColumn = 'id';

  protected $uuidFields = ['uid', 'emailCode'];
  protected $intBoolFields = ['isVerified', 'isPrimary'];

  normalizedEmail!: string;
  email!: string;
  uid!: string;
  isVerified!: boolean;
  isPrimary!: boolean;
  emailCode!: string;
  verifiedAt?: number;
  createdAt!: number;
}
