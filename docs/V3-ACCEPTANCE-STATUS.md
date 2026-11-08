# V3 acceptance work — 8 November 2026

Owner acceptance of all six areas is recorded in issues #166–#171. Technical evidence is tracked separately.

| Area | Work started / evidence | Remaining condition |
| --- | --- | --- |
| RPO and production health | Re-ran production workflow 42468942875, attempt 2: SUCCESS for pages, core routes, all four APIs, assistant and mobile checks. Original RPO address is responding again. | Monitor future failures; do not replace endpoint with an unverified address. |
| Calculators | Added browser scenarios for salary, housing reserve and three-vehicle TCO at 390 and 1280 px. Known numeric fixtures, invalid inputs, zero division and input changes are checked. | New CI result required. Salary fixtures check the implemented model, not every statutory exception. |
| Life situations and calendar | Added browser checks for persisted calendar event, escaped ICS download, removal and claim generation without transmitting fixture data. | New CI result required. No legal certification implied. |
| Performance | Browser acceptance logs single-navigation lab duration for six routes on mobile and desktop. Public metrics page separates these from field data. | Field LCP/INP/CLS with period and sample size are not yet available in this review. |
| Accessibility | Added baseline checks for one H1/main, labelled form fields, image alternatives, Slovak language and overflow. | Full keyboard, screen-reader, contrast and WCAG audit remains open. |
| Metrics | `/metriky/` derives catalogue totals from source data and links the owner to Cloudflare analytics; public traffic figures are explicitly unavailable. | Authenticated traffic data is not wired into the public page. No invented counts. |
| Privacy | Corrected obsolete claim that assistant questions never reach AI; describes local and online modes consistently. | Privacy email forwarding is not yet active; complete specialist assessment remains open. |
| Main protection | Rechecked: `protected: false`. Rulesets read returned 403 requiring GitHub Pro/public repository; protection read returned integration-permission 403. | Owner plan/admin capability. No plan purchase, visibility change, CI removal or protection bypass performed. |

Local `npm test` passed before publication. GitHub CI must additionally run the build, link checks and browser acceptance. This document is a work record, not a blanket release certification.
