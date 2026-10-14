# Focus editable landers and ads launch

## Included

- `/website`: authenticated website workspace for both `/` and `/beratung`.
- Admins have access. Other active, auth-bound profiles require their email in server-only `WEBSITE_EDITOR_EMAILS`. Allowlisted accounts get an `editor` app role at login. Existing CRM/admin APIs still require the database admin role. No new database role or client-metadata privilege is introduced.
- The editor can save drafts, preview mobile/desktop, publish and restore the previous published copy. Concurrent edits are rejected rather than overwritten. Home and Beratung have independent documents in `mpu_settings`.
- Copy is validated against a strict schema. Editors cannot change form endpoints, answer values, consent, tracking IDs, contact destinations or CRM routing.
- `/beratung` has three screens: reason, timeframe, contact details. Optional callback preferences are retained when navigating back. Success and the form conversion require a persisted lead ID.
- Mustafa Sahin's adviser card uses the supplied portrait, restored with the built-in imagegen tool. Name, role and introduction are editable. Mobile uses a close crop; desktop shows the full portrait.
- The editor supports three review cards with original quote, display name, HTTPS source and optional original star rating. Empty slots stay hidden publicly. The editor shows explicitly labelled layout placeholders when no reviews exist. ON MPU's Trustpilot page is a visual reference only; none of its reviews, ratings or counts are reused as Focus endorsements. Add genuine Focus reviews before publishing this section.
- Contact names share one row on mobile; callback preferences are collapsed by default. Invalid submissions focus the first field error. Requests time out after 20 seconds while retaining inputs and the retry key.
- Each unchanged Beratung submission has a random request ID. Concurrent retries return its original receipt and do not send another notification. Changed enquiry data needs a new key; a new enquiry from the same email gets its own CRM record. Existing contacts, notes and attribution are never overwritten by email matching.
- Phone and WhatsApp buttons appear only with valid configured E.164 numbers. The preview shows disabled buttons so their copy can be edited. Clicking a contact button does not create a CRM lead or claim a completed call/message.
- CRM acquisition metadata is separate from editable notes: website, landing page, region, form channel, contact consent and allowed campaign parameters. Website is always assigned as `focus` by this endpoint; a request cannot impersonate Kompakt.
- Optional SMTP notifications have a four-second delivery deadline and contain only the new lead reference. Failures cannot undo lead creation. `pending` means sending or status persistence was not confirmed; staff must follow up manually. There is no automatic retry queue in this version.

## Deployment order

1. Apply `supabase/migrations/20261013113533_focus_lead_acquisition.sql` and `supabase/migrations/20261014082110_lead_submission_retry.sql` before deploying the application. These add acquisition/notification and retry metadata. The latter replaces email uniqueness with request-ID uniqueness; it preserves all existing rows. Both are applied to the connected Focus project. Existing RLS is unchanged, including the legacy public-insert policy; privileged reads still use server credentials.
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
- Genuine Focus review quotes/source links, adviser qualifications if these should be shown, and the future Focus Trustpilot profile. No Trustpilot widget or aggregate rating is configured yet.

Kompakt remains a later integration: obtain WordPress/form access and connect a protected, source-identifying ingestion path to this CRM. Neither site needs to move into the other's frontend framework. This PR does not integrate Kompakt or launch campaigns.

## Local verification

`node --test tests/landing-editor.test.cjs`, `npm run type-check`, `npm run lint`, `npm run build`.

Tests use isolated database/mail transports and cover schema boundaries, review validation, draft/publish isolation and concurrency, authorization/revocation, consent and conversion labels, lead validation/persistence, immutable acquisition, notification failures, concurrent retries, repeat enquiries and client timeouts. A rolled-back SQL check against the connected database verified that the same email can create two enquiries while duplicate request IDs are rejected. These checks do not replace live-account tag verification. The existing process-local form rate limiter is not a distributed abuse-control guarantee. Legacy installations using the old `leads` fallback do not support the new idempotency guarantee.

## Adviser image

Asset: `public/advisers/mustafa-sahin-v1.png`. Built-in imagegen edit; no CLI/API fallback. The original supplied image was left unchanged. Final prompt:

> Use case: identity-preserve. Asset type: compact adviser portrait for MPU Focus consultation landing page. Input image 1 is the edit target, a real portrait of Mustafa Sahin. Produce a natural, carefully restored portrait: gently improve image clarity and balanced exposure, soften only the distracting shelf background very slightly. Preserve his exact identity, facial proportions, hair, skin texture, expression, dark navy shirt, seated pose and hands, and the existing office setting. Keep the same portrait composition with head and hands visible. Do not invent credentials, objects or text. No beauty retouching, face reshaping, new smile, badges, logos or watermark. Output a professional but authentic photograph.
