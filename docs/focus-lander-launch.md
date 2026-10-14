# Focus editable landers and ads launch

## Included

- `/website`: authenticated website workspace for both `/` and `/beratung`.
- Admins have access. Other active, auth-bound profiles require their email in server-only `WEBSITE_EDITOR_EMAILS`. Allowlisted accounts get an `editor` app role at login. Existing CRM/admin APIs still require the database admin role. No new database role or client-metadata privilege is introduced.
- The editor can save drafts, preview mobile/desktop, publish and restore the previous published copy. Concurrent edits are rejected rather than overwritten. Home and Beratung have independent documents in `mpu_settings`.
- Copy is validated against a strict schema. Editors cannot change form endpoints, answer values, consent, tracking IDs, contact destinations or CRM routing.
- `/beratung` has three screens: reason, timeframe, contact details. Optional callback preferences are retained when navigating back. Success and the form conversion require a persisted lead ID.
- Phone and WhatsApp buttons appear only with valid configured E.164 numbers. The preview shows disabled buttons so their copy can be edited. Clicking a contact button does not create a CRM lead or claim a completed call/message.
- CRM acquisition metadata is separate from editable notes: website, landing page, region, form channel, contact consent and allowed campaign parameters. Website is always assigned as `focus` by this endpoint; a request cannot impersonate Kompakt.
- Optional SMTP notifications have a four-second delivery deadline and contain only the new lead reference. Failures cannot undo lead creation. `pending` means sending or status persistence was not confirmed; staff must follow up manually. There is no automatic retry queue in this version.

## Deployment order

1. Apply `supabase/migrations/20261013113533_focus_lead_acquisition.sql` to the target database before deploying the application. This adds `acquisition` and `notification_status` to `mpu_signups`, without changing existing service-only RLS. The PR does not apply the migration remotely.
2. Set existing database/auth secrets and the additional variables in `.env.example`. Rebuild for every `NEXT_PUBLIC_*` change. Missing numbers hide their buttons; absent conversion labels suppress the corresponding event; absent notification configuration disables email.
3. Provision the editor's existing Supabase Auth account and matching active `mpu_profiles` row with `role=student`, the correct `auth_user_id`, and `academy_access_enabled=false` for website-only use. Add the confirmed email to `WEBSITE_EDITOR_EMAILS`, then sign in at `/login`. Do not use the admin account or `ADMIN_EMAIL` for Frank. No client account is created by this PR. Removing the allowlist entry/redeploying or deactivating the profile revokes access on the next server request, including existing sessions.
4. Check authenticated draft/save/publish/restore against the deployed database and verify an editor gets 403 from `/api/leads` and finance APIs. The `/editor-demo` routes are development-only and return 404 in production.
5. Submit an explicitly approved test lead on the deployed site, verify its CRM acquisition/notification status, then verify conversion delivery with the real Ads account. Repeat with optional cookies declined: lead capture must work without Google requests. Verify phone and WhatsApp destinations on a real phone. No live lead, live email or Ads account mutation is part of PR testing.

The old `leads` table fallback is retained only for installations without `mpu_signups`; it embeds acquisition in notes because the legacy schema has no metadata column. This is not the shared-CRM launch target. Missing columns or unrelated database errors must fail visibly rather than silently switch tables.

## Tracking contract

`NEXT_PUBLIC_GOOGLE_ADS_ID` is the real `AW-...` tag ID. `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` is the general successful-form label. `NEXT_PUBLIC_GOOGLE_ADS_PHONE_LABEL` and `NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL` are separate click labels.

Optional `SOEST_*` and `OLPE_*` labels override the corresponding general label. Focus campaign URLs are `/beratung?region=soest` and `/beratung?region=olpe`; absent/unknown regions become `general`. These select reporting, not separate regional copy or geolocation. Use region URLs only once the Focus campaign geography is confirmed. Attribution is browser-supplied reporting context, not independently verified ad provenance.

Google loads only after optional-cookie acceptance. Attribution is kept in session storage only after acceptance and cleared on revocation. MPU answers, names, email and phone are never passed to the tag by this implementation. URL query strings are excluded from the configured page location. Form conversions use the saved lead ID for deduplication. Contact events report channel, fixed button placement and region; absent labels mean no conversion event.

Configure saved forms as primary and count One; phone/WhatsApp clicks should be secondary observation actions. Avoid adding these secondary signals to custom bidding goals. Those settings live in Google Ads, not the editor. See [Google's primary/secondary guidance](https://support.google.com/google-ads/answer/11461796?hl=en-GB) and [tag CSP requirements](https://developers.google.com/tag-platform/security/guides/csp). No thank-you URL pageview conversion should duplicate the successful-submit event. The WordPress/Borlabs instructions and translated thank-you paths in the client brief do not apply to Focus.

## Still needed from the client before paid traffic

- Frank's confirmed editor email.
- Real Focus phone and WhatsApp destinations.
- Google Ads tag ID and individual conversion labels; confirmation whether Focus will target Soest/Olpe, and which site launches first.
- Focus notification recipient and working SMTP configuration. `info@mpu-kompakt.de` is not assumed to be the Focus destination.
- Approved offer/claims, contact hours, company details and privacy wording for the deployed services.

Kompakt remains a later integration: obtain WordPress/form access and connect a protected, source-identifying ingestion path to this CRM. Neither site needs to move into the other's frontend framework. This PR does not integrate Kompakt or launch campaigns.

## Local verification

`node --test tests/landing-editor.test.cjs`, `npm run type-check`, `npm run lint`, `npm run build`.

Tests use isolated database/mail transports and cover schema boundaries, draft/publish isolation and concurrency, authorization/revocation, consent and conversion labels, lead validation/persistence, immutable acquisition and notification failures. These checks do not replace live-account tag verification or a deployed database migration check. The existing process-local form rate limiter is not a distributed abuse-control guarantee. The existing unique-email constraint still rejects repeat requests from an email already in the CRM; it does not silently overwrite a prior lead.
