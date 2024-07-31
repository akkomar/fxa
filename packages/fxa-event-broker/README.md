# fxa-event-broker

The Firefox Accounts Event Broker (fxa-event-broker) is a webhook event delivery
system for events in Firefox Accounts. These events are currently consumed from an
internal priviledged queue that FxA services publish to, screened to determine what
Relying Parties (RPs) should receive them, then distributed via webhooks using the
[Security Event Token (SET)][set] format.

This event broker also stores event metadata, tracking which RPs a user has logged
into to screen event delivery to relevant RPs.

## Relying Party Event Format

A relying party will get webhook calls for events. These events are encoded in
[SET][set]s with the following formats. See the [SET RFC][set] for definitions and other
examples.

### Password Change

Sent when a user has reset or changed their password. Services receiving this event
should terminate user login sessions that were established prior to the event.

- Event Identifier
  - `https://schemas.accounts.firefox.com/event/password-change`
- Event Payload
  - [Password Event Identifier]
    - changeTime
      - Time when the password reset took place. All logins established before this
        time should be terminated.

### Example Password Change Event

    {
     "iss": "https://accounts.firefox.com/",
     "sub": "FXA_USER_ID",
     "aud": "REMOTE_SYSTEM",
     "iat": 1565720808,
     "jti": "e19ed6c5-4816-4171-aa43-56ffe80dbda1",
     "events": {
       "https://schemas.accounts.firefox.com/event/password-change": {
           "changeTime": 1565721242227
       }
     }

### Profile Change

Sent when a user has changed their profile data in some manner. Changes to any of the following user data will trigger this event.

- Display Name - This can be changed on the account settings page
- Email Address - This can be changed on the settings page by updating the primary email address
- Profile Image - This can be changed on the settings page
- Metrics Collection Enabled - This can be changed on the account settings page through the ‘Help Improve Mozilla Accounts’ option in the `Data Collection and Use` section.
- Locale - This can be changed through the admin panel, and represents their language preference.
- Totp Enabled - This can be changed through the admin panel.
- Account Disabled - This can be changed through the admin panel.
- Account Locked - This can be changed through the admin panel. The state can be changed back to unlocked once a user accepts an account reset.
- A change to subscription state - There's several ways this can occur but in general this happens when signing up for or canceling subscriptions.

When the event fires, it has the following structure:

- Event Identifier
  - `https://schemas.accounts.firefox.com/event/profile-change`
- Event Payload
  - [Profile Event Identifier]
    - uid {string} (required) - The account’s unique identifier

It’s important to note that this event does not indicate what changed. Rather, it merely signals that services should update any cached profile data
they have for this user. Furthermore, it’s possible that the data which changed was outside the OAuth scope the service was granted, in which case
the service might not have privileges to access what was changed.

### Example Profile Change Event

    {
     "iss": "https://accounts.firefox.com/",
     "sub": "FXA_USER_ID",
     "aud": "REMOTE_SYSTEM",
     "iat": 1565720808,
     "jti": "e19ed6c5-4816-4171-aa43-56ffe80dbda1",
     "events": {
       "https://schemas.accounts.firefox.com/event/profile-change": {
         "uid": "cd1181e0532c45cb989a7c234641468e"
       }
     }

### Subscription State Change

Sent when a user's subscription state has changed to RPs that provide the changed
subscription capability.

**NOTE**: There are strict requirements about subscription state change handling
based on the `changeTime` as documented below.

- Event Identifier
  - `https://schemas.accounts.firefox.com/event/subscription-state-change`
- Event Payload
  - [Subscription Event Identifier]
    - capabilities
      - List of subscription capabilities
    - isActive
      - Boolean indicating if the subscription should be considered active or not
        for the subscription capabilities provided.
    - changeTime
      - Time in seconds when the state change occured in the payment system.
        This value MUST be tracked by the receiving system, and events with a
        changeTime older than the last tracked time MUST be discarded.

### Example Subscription State Change Event

    {
     "iss": "https://accounts.firefox.com/",
     "sub": "FXA_USER_ID",
     "aud": "REMOTE_SYSTEM",
     "iat": 1565720808,
     "jti": "e19ed6c5-4816-4171-aa43-56ffe80dbda1",
     "events": {
       "https://schemas.accounts.firefox.com/event/subscription-state-change": {
           "capabilities": ["capability_1", "capability_2"],
           "isActive": true,
           "changeTime": 1565721242227
       }
     }

### Delete User

Sent when a user has been deleted from Firefox Accounts. RPs MUST delete all user
records for the given user when receiving this event.

- Event Identifier
  - `https://schemas.accounts.firefox.com/event/delete-user`
- Event Payload
  - [Delete Event Identifier]
    - `{}`

### Example Delete Event

    {
     "iss": "https://accounts.firefox.com/",
     "sub": "FXA_USER_ID",
     "aud": "REMOTE_SYSTEM",
     "iat": 1565720810,
     "jti": "1b3d623a-300a-4ab8-9241-855c35586809",
     "events": {
       "https://schemas.accounts.firefox.com/event/delete-user": {}
     }

### Metrics Opt Out

Sent when a user opts out of metrics / data collection from their Mozilla Accounts settings page.
RPs should stop reporting metrics for this user. Note, that when a user creates an account, metrics
collection is enabled by default.

- Event Identifier
  - `https://schemas.accounts.firefox.com/event/metrics-opt-out`
- Event Payload
  - [Metrics Opt Out Event Identifier]
    - `{}`

### Metrics Opt In

Sent when a user opts back into metrics / data collection from Firefox Accounts their Mozilla Accounts settings page.
RPs can start reporting metrics for this user again.

- Event Identifier
  - `https://schemas.accounts.firefox.com/event/metrics-opt-in`
- Event Payload
  - [Metrics Opt In Event Identifier]
    - `{}`

## Deployment

### Metrics

The Event Broker emits statsD style metrics. A statsD compatible host should be
defined to capture these. All timings are in milliseconds.

| Event Name                  | Type    | Description                                                     |
| --------------------------- | ------- | --------------------------------------------------------------- |
| `message.processing.total`  | Timing  | Total time spent processing a service notification.             |
| `message.queueDelay`        | Timing  | Time the event was in the service notification queue.           |
| `proxy.sub.queueDelay`      | Timing  | Time the event was in the PubSub proxy queue.                   |
| `message.sub.eventDelay`    | Timing  | Time from Stripe subscription event until processed from queue. |
| `proxy.sub.eventDelay`      | Timing  | Time from Stripe subscription event until delivered to RP.      |
| `message.type.subscription` | Counter | Subscription notification events.                               |
| `message.type.login`        | Counter | Login notification events.                                      |
| `message.type.delete`       | Counter | Delete notification events.                                     |
| `proxy.success.CID.STATUS`  | Counter | Successful event delivery to a RP.                              |
| `proxy.fail.CID.STATUS`     | Counter | Failed event delivery to a RP.                                  |

`CID` - Client Id of Relying Party.

### Testing a Webhook URL

To verify that a webhookUrl can process a payload correctly, the simulator can
be used to generate a simulated JWT signed payload. The relying party can verify
this worked correctly before a full deployment occurs.

Command Syntax:

    node dist/scripts/simulate-webhook-call.js CLIENTID WEBHOOKURL CAPABILITIES

Where `CAPABILITIES` is a comma-seperated string of capabilities to include.

#### Usage

```bash
$ yarn build
$ export LOG_FORMAT=pretty
$ node dist/scripts/simulate-webhook-call.js a9238ba https://example.com/webhook capability_1
fxa-event-broker.simulateWebhookCall.INFO: webhookCall {"statusCode":200,"body":"ok\n"}
$
```

## Software Architecture

The event-broker [architecture document](./architecture.md) describes the overall flow of data
from fxa-auth-server via SQS into event-broker and back out to relying parties (RPs). The [mermaid](https://mermaid-js.github.io/mermaid/#/) diagrams
found there can be copied into the [mermaid live editor] to view. Extensions
[are available for VS Code](https://marketplace.visualstudio.com/items?itemName=bpruitt-goddard.mermaid-markdown-syntax-highlighting) and other editors that allow local previews
of the diagrams.

This package is built using [NestJS](https://nestjs.com/) and follows module/service/providor patterns as documented for a NestJS project.

[fxasp]: https://github.com/mozilla/fxa/blob/main/packages/fxa-auth-server/docs/service_notifications.md
[mermaid live editor]: https://mermaid-js.github.io/mermaid-live-editor/
[mermaid]: mermaidjs.github.io/
[set]: https://tools.ietf.org/html/rfc8417

## Testing

This package uses [Jest](https://mochajs.org/) to test its code. By default `yarn test` will test all files ending in `.spec.ts`.

Test commands:

```bash
# Test with coverage
yarn test-cov

# Test on file change
yarn test-watch
```
