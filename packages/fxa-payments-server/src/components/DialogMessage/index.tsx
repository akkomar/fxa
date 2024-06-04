/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { ReactNode } from 'react';
import { Localized } from '@fluent/react';
import classNames from 'classnames';
import { useClickOutsideEffect } from 'fxa-react/lib/hooks';

import Portal from 'fxa-react/components/Portal';

import './index.scss';
import { ReactComponent as CloseIcon } from '@fxa/shared/assets/images/close.svg';

type DialogMessageProps = {
  className?: string;
  onDismiss?: Function;
  children: ReactNode;
  headerId: string;
  descId: string;
  'data-testid'?: string;
};

/* istanbul ignore next - not worth testing this function */
const noop = () => {};

export const DialogMessage = ({
  className = '',
  onDismiss,
  children,
  headerId,
  descId,
  'data-testid': testid = 'dialog-message-container',
}: DialogMessageProps) => {
  const dialogInsideRef = useClickOutsideEffect<HTMLDivElement>(
    // HACK: can't use the hook conditionally, so let's supply a dummy
    // function when onDismiss is missing
    onDismiss || noop
  );
  return (
    <Portal id="dialogs">
      <div data-testid={testid} className={classNames('blocker', 'current')}>
        <div
          data-testid="dialog-message-content"
          className={classNames('modal', className)}
          ref={dialogInsideRef}
        >
          {onDismiss && (
            <Localized id="close-aria">
              <button
                data-testid="dialog-dismiss"
                className="dismiss"
                aria-label="Close modal"
                onClick={onDismiss as () => void}
              >
                <CloseIcon
                  role="img"
                  className="w-4 h-4"
                  aria-hidden="true"
                  focusable="false"
                />
              </button>
            </Localized>
          )}
          <div
            aria-labelledby={headerId}
            aria-describedby={descId}
            className="message"
            data-testid="dialog-message-information"
            role="dialog"
          >
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DialogMessage;
