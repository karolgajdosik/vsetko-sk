# Operational follow-up — 8 November 2026

These items were investigated together with PR #224; they are not waiting for another development kickoff.

## Privacy email

Public DNS currently has Cloudflare nameservers but **Websupport mail routing**:

- MX 10 `mx10.websupport.sk`
- MX 100 `mx20.websupport.sk`
- SPF includes `_spf.m1.websupport.sk`

The available Cloudflare browser session opens the sign-in page and no connected Cloudflare plugin was found. No email/admin session or verified destination mailbox is available to this task. The existing public privacy page correctly marks `sukromie@vsetko24.sk` as awaiting activation.

The least disruptive setup is an alias/forwarder in the existing Websupport mail service to an owner-verified destination. Enabling Cloudflare Email Routing can require replacing the current MX records and must not silently change delivery for existing mailboxes. Next steps after authenticated mail-admin access and destination verification: create only the named alias, verify the destination, verify inbound delivery, then remove the pending-activation wording. No MX records or mail delivery settings were changed.

## Field Core Web Vitals

Cloudflare Web Analytics beacon is already present in production. Authenticated analytics are not accessible in the current session. The public PageSpeed API request returned HTTP 429 with quota exhausted; this provides no field measurement.

PR #224 starts actual mobile Lighthouse measurements against production and preserves HTML/JSON reports. Scores and LCP/CLS/TBT are lab results only. The public metrics page records the dated, single-run snapshot. Field INP and a visitor-population p75 assessment must come from an authenticated analytics/CrUX dataset with period and sample context. No extra visitor tracking or paid service was introduced.

## Main branch protection

`main` reports `protected: false`. GitHub rulesets returned 403 requiring GitHub Pro or a public repository; branch-protection reads returned integration-permission 403. Existing validation and manual review guards remain enabled. Enforced protection needs a supported private-repository plan and administrator capability. No subscription purchase, visibility change, broader credential grant or security bypass was performed. See `BRANCH-PROTECTION.md` for the prepared verification procedure.

## Official sources and accessibility

The first source job checked all 29 distinct source URLs for 40 guides: 28 reachable, one unresolved endpoint for ID cards. Follow-up replacements use verified, topic-specific official pages for two ID-card guides, inheritance, household expenses and winter driving. HTTP availability is distinguished from full factual/legal review.

The first axe invocation exposed an audit-harness issue (`browser.newPage()` creates an owned context incompatible with axe's cross-frame operation). It was corrected to explicit `browser.newContext()` and will be rerun. An execution error is never counted as a passing accessibility result. Automated findings, incomplete/manual checks and keyboard execution errors are reported separately. Full screen-reader and usability assessment remains manual work.

## Results after the first complete axe scan

The corrected audit completed 125 pages / 151 display variants without execution or skip-link errors. It found 448 repeated rule instances in five rule types: contrast, visible-name mismatch, link distinction, target size and prohibited ARIA attributes. Shared corrections darken insufficient light text, underline prose links, enlarge list targets, align visible A+/A− and assistant labels, and give the map/budget graphics valid roles. These changes are undergoing a complete rerun; no axe rule or page was excluded to obtain a pass.

The availability audit was extended beyond primary source fields to all external HTTPS URLs nested in the guides, including screen-navigation links. The primary-source-only pass is not misrepresented as a check of every nested destination.

## Verified completion and remaining handover

PR #224 passed the complete rerun: 125 pages / 151 variants, zero axe violations, zero execution/skip-link errors. Availability: 43/48 nested URLs reachable, zero confirmed 404/410, five unresolved; all 28 primary URLs reachable. Production monitor and main CI passed for `1288fbc49957ba8fe783daf074317a3b845374dd`. These results supersede the first-scan paragraphs above.

All 40 guides now have structured detailed procedures (25 newly completed; 100 new steps). New text avoids invented screenshots, current fee promises and unverified deadlines. Source availability does not certify the complete editorial/legal accuracy.

Privacy contact is now rendered from `src/data/site-operations.json` through `PrivacyContact.astro`. Keep `privacyEmailActive` false and `privacyEmailVerifiedAt` null until actual delivery is verified. Never put the private forwarding destination into public source configuration.

Email activation procedure (existing Websupport MX):
1. Owner signs into Websupport WebAdmin for vsetko24.sk and confirms an owned forwarding destination. No password is supplied in chat.
2. Follow the provider's alias/forwarder guide: https://www.websupport.sk/podpora/kb/aliasy-a-presmerovania-e-mailov/ . Create only `sukromie`; do not replace domain MX or other aliases.
3. Obtain explicit destination verification and perform an owner-authorized inbound delivery test. Confirm message reception, spam handling and replies.
4. Set active true and the real verification timestamp in the public configuration; CI/build and both contact/privacy production pages must pass.

Unresolved interactive destinations remain genuine official links, not silently removed to produce a green report: portal.minv.sk, zrsr.sk, mzv.sk, kataster.vugk.sk, kataster.skgeodesy.sk/eskn-portal/. Each affected guide retains its topic-specific primary informational source as a fallback. Recheck in an ordinary browser; report network/bot limits separately from confirmed broken links.
