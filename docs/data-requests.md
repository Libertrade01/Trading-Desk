# Account data request runbook

Libertrade does not display export or deletion controls inside the app. Requests arrive through `support@libertrade.app` and are completed manually after account ownership is verified.

## Before taking action

1. Reply to the account email address, not a different address supplied in the request.
2. Ask the user to confirm the request from that account email.
3. Record the request date, verification date, action taken and completion date in a private support log.
4. Never send an export to a different email address without a stronger identity check.

## Export

Run from the project directory with production Supabase credentials available in the environment:

```powershell
node --env-file=.env.local scripts/export-user-data.mjs --email user@example.com --out C:\secure\libertrade-export.json
```

Review the file, transmit it through an appropriately secure channel, then remove the working copy when delivery is confirmed.

## Deletion

Offer an export before deletion. Deletion is permanent and requires the email address twice:

```powershell
node --env-file=.env.local scripts/delete-user-account.mjs --email user@example.com --confirm user@example.com
```

Deleting the Supabase authentication user cascades through user-owned application data, trades, trading days, trade notes, tag links and legal-acceptance records under the database foreign keys.

## Target response time

Respond promptly and track the statutory deadline that applies to the user. If a request is complex, disputed or involves a child, seek appropriate legal advice before refusing or extending it.
