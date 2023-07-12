/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

// This contains classes and functions used to import users from Apple into FxA.
const fs = require('fs');
const path = require('path');
const program = require('commander');

const axios = require('axios');
const random = require('../../lib/crypto/random');
const Log = require('../../lib/log')
const uuid = require('uuid');

const GRANT_TYPE = 'client_credentials';
const SCOPE = 'user.migration';
const USER_MIGRATION_ENDPOINT = 'https://appleid.apple.com/auth/usermigrationinfo';

const APPLE_PROVIDER = 'apple';

export class AppleUser {
  constructor(email, transferSub, uid, alternateEmails, db, writeStream, config, mock, log) {
    this.email = email;
    this.transferSub = transferSub;
    this.uid = uid;
    this.alternateEmails = alternateEmails || [];
    this.db = db;
    this.writeStream = writeStream;
    this.config = config;
    this.mock = mock;
    this.log = log;
  }

  // Exchanges the Apple `transfer_sub` for the user's profile information and
  // moves the user to the new team.
  // Ref: https://developer.apple.com/documentation/sign_in_with_apple/bringing_new_apps_and_users_into_your_team#3559300
  async exchangeIdentifiers(accessToken) {
    try {
      
      if (this.mock) {
        this.appleUserInfo = {
          sub: this.transferSub,
          email: this.email,
          is_private_email: false,
        };
        return {
          sub: this.transferSub,
          email: this.email,
          is_private_email: false,
        };
      }

      const options = {
        transfer_sub: this.transferSub,
        client_id: this.config.appleAuthConfig.clientId,
        client_secret: this.config.appleAuthConfig.clientSecret,
      };
      const res = await axios.post(USER_MIGRATION_ENDPOINT,
        new URLSearchParams(options).toString(),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Apple user info here contains `sub` (Apple unique id), `email` and `is_private_email`
      this.appleUserInfo = res.data;
      return res.data;
    } catch (err) {
      this.setFailure(err);
      if (err.response && err.response.status === 429) {
        console.error(`Rate limit exceeded, try again later: ${this.transferSub}`);
      } else {
        console.error(`Something went wrong with transfer: ${this.transferSub} ${err}`);
      }
    }
  }

  setSuccess(accountRecord) {
    this.success = true;
    this.accountRecord = accountRecord;
  }

  setFailure(err) {
    this.success = false;
    this.err = err;
  }

  async createLinkedAccount(accountRecord, sub) {
    // If the user already has a linked account, delete it and create a new one.
    await this.db.deleteLinkedAccount(accountRecord.uid, APPLE_PROVIDER);
    await this.db.createLinkedAccount(accountRecord.uid, sub, APPLE_PROVIDER);
  }

  async createUpdateFxAUser() {
    const sub = this.appleUserInfo.sub; // The recipient team-scoped identifier for the user.
    
    const pocketEmail = this.email;
    const isPrivateEmail = this.appleUserInfo.is_private_email; // Boolean if email is private
    const privateEmail = this.appleUserInfo.email;
    
    // 1. Check if user exists in FxA via the uid value from Pocket. We should expect
    // the uid to be valid, but if it isn't error out.
    try {
      if (this.uid) {
        if (this.mock) {
          console.log(`Mock: Linking existing user with uid: ${this.uid}`);
          this.setSuccess({uid: this.uid, email: this.email});
        } else {
          const accountRecord = await this.db.account(this.uid);
          await this.createLinkedAccount(accountRecord, sub);
          this.setSuccess(accountRecord);
        }
        return;
      }
    } catch (err) {
      // We shouldn't expect Pocket to send an uid that doesn't exist in FxA, but
      // if they do, continue to create user.
      const msg = `Uid not found: ${this.uid}`;
      console.error(msg);
    }

    // 2. Check all emails to see if there exists a match in FxA, link Apple account
    // to the FxA account.
    let accountRecord;
    
    // FxA tries to find an email match in the following order:
    // 1. Primary email from Pocket
    // 2. Alternate emails from Pocket
    // 3. Apple private email from `transfer_sub`
    this.alternateEmails.unshift(pocketEmail);
    
    if (isPrivateEmail) {
      this.alternateEmails.push(privateEmail);
    }

    if (this.alternateEmails) {
      for (const email of this.alternateEmails) {
        try {
          accountRecord = await this.db.accountRecord(email);
          break;
        } catch (err) {
          // Account not found try next email
        }
      }
    }
    // There was a match! Link the Apple account to the FxA account.
    if (accountRecord) {
      if (this.mock) {
        console.log(`Mock: Linking existing user with email: ${accountRecord.email}`);
        this.setSuccess({uid: this.uid, email: accountRecord.email});
        return;
      }
      
      await this.createLinkedAccount(accountRecord, sub);
      this.setSuccess(accountRecord);
      return;
    }

    // 3. No matches mean this is a completely new FxA user, create the user and
    // link the Apple account to the FxA account.
    try {
      if (this.mock) {
        console.log(`Mock: No user found, creating new user with email: ${pocketEmail}`);
        this.setSuccess({uid: uuid.v4({}, Buffer.alloc(16)).toString('hex'), email: pocketEmail});
        return;
      }
      
      const emailCode = await random.hex(16);
      const authSalt = await random.hex(32);
      const [kA, wrapWrapKb] = await random.hex(32, 32);
      
      // Is Pocket email private? Use the new private email from Mozilla Apple.
      let accountEmail = pocketEmail;
      if (!pocketEmail || pocketEmail.endsWith('privaterelay.appleid.com')) {
        accountEmail = privateEmail;
      }
      accountRecord = await this.db.createAccount({
        uid: uuid.v4({}, Buffer.alloc(16)).toString('hex'),
        createdAt: Date.now(),
        email: accountEmail,
        emailCode,
        emailVerified: true,
        kA,
        wrapWrapKb,
        authSalt,
        verifierVersion: this.config.verifierVersion,
        verifyHash: Buffer.alloc(32).toString('hex'),
        verifierSetAt: 0, // No password set
      });
      await this.createLinkedAccount(accountRecord, sub);
      this.setSuccess(accountRecord);
    } catch (err) {
      this.setFailure(err);
    }
  }

  async transferUser(accessToken) {
    await this.exchangeIdentifiers(accessToken);
    if (!this.err) {
      await this.createUpdateFxAUser(this.appleUserInfo);
    }
    this.saveResult();
    console.log(`Transfer complete: ${this.transferSub} ${this.success}`);
  }
  
  saveResult() {
    if (!this.success) {
      console.log(`Failed to transfer ${this.transferSub}`);
      const transferSub = this.transferSub;
      const success = this.success;
      const err = (this.err && this.err.message) || '';
      const line = `${transferSub},,,,${success},${err}`;
      this.writeStream.write(line + '\n');
    } else {
      const appleEmail = this.appleUserInfo.email;
      const fxaEmail = this.accountRecord.email;
      const uid = this.accountRecord.uid; // Newly created uid
      const transferSub = this.transferSub;
      const success = this.success;
      const err = (this.err && this.err.message) || '';

      this.log.notifyAttachedServices(
        'appleUserMigration', {},
        {
          uid,
          appleEmail,
          fxaEmail,
          transferSub,
          success,
          err,
        },
      );
      const line = `${transferSub},${uid},${fxaEmail},${appleEmail},${success},${err}`;
      this.writeStream.write(line + '\n');
    }
  }
}

export class ApplePocketFxAMigration {
  constructor(filename, config, db, outputFilename, delimiter, mock) {
    this.users = [];
    this.db = db;
    this.filename = filename;
    this.config = config;
    this.delimiter = delimiter;
    this.mock = mock;

    this.writeStream = fs.createWriteStream(outputFilename);
    this.writeStream.on('finish', () => {
      console.log(`Results saved successfully ${outputFilename}`);
    });
    this.writeStream.on('error', (err) => {
      console.error(`There was an error writing the file: ${err}`);
    });

    const statsd = {
      increment: () => {},
      timing: () => {},
      close: () => {},
    };
    this.log = Log({
      ...config.log,
      statsd,
    });
  }

  parseCSV() {
    try {
      const input = fs
        .readFileSync(path.resolve(this.filename))
        .toString('utf8');

      if (!input.length) {
        return [];
      }

      // Parse the input file CSV style
      return input.split(/\n/).map((s, index) => {
        // First index is the row headers
        if (index === 0 || s === "") return;

        const delimiter = program.delimiter || ',';
        const tokens = s.split(delimiter);
        const transferSub = tokens[0];
        
        const uid = tokens[1];
        const email = tokens[2];
        let alternateEmails = [];

        if (tokens[3]) {
          // Splits on `:` since they are not allowed in emails
          alternateEmails = tokens[3].replaceAll('"', '').split(':');
        }
        return new AppleUser(email, transferSub, uid, alternateEmails, this.db, this.writeStream, this.config, this.mock, this.log);
      }).filter((user) => user);
    } catch (err) {
      console.error('No such file or directory');
      process.exit(1);
    }
  }

  writeStreamFileHeader() {
    this.writeStream.write('transferSub,uid,fxaEmail,appleEmail,success,err\n');
  }

  writeStreamClose() {
    this.writeStream.end();
  }

  async transferUsers() {
    this.writeStreamFileHeader();

    const accessToken = await this.generateAccessToken();
    for (const user of this.users) {
      await user.transferUser(accessToken);
    }

    this.writeStreamClose();
  }

  async load() {
    this.db = await this.db.connect(this.config);
    this.users = this.parseCSV();
    console.info(
      '%s accounts loaded from %s',
      this.users.length,
      this.filename,
    );
  }

  async close() {
    await this.db.close();
  }

  async generateAccessToken() {
    if (this.mock) {
      return 'mock';
    }
    
    const tokenOptions = {
      grant_type: GRANT_TYPE,
      scope: SCOPE,
      client_id: this.config.appleAuthConfig.clientId,
      client_secret: this.config.appleAuthConfig.clientSecret,
    };
    const tokenRes = await axios.post(this.config.appleAuthConfig.tokenEndpoint,
      new URLSearchParams(tokenOptions).toString(),
    );
    console.log('Obtained access token');
    return tokenRes.data['access_token'];
  }
}
