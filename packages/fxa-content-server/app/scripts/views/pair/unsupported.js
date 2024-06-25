/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import FormView from '../form';
import Template from '../../templates/pair/unsupported.mustache';
import GleanMetrics from '../../lib/glean';

class PairUnsupportedView extends FormView {
  template = Template;

  logView() {
    GleanMetrics.cadMobilePairUseAppView.view();
    return FormView.prototype.logView.call(this);
  }
}

export default PairUnsupportedView;
