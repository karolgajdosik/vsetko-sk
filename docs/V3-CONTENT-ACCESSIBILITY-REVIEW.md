# Content, accessibility and indexing review — 8–9 November 2026

This records actual checks and corrections, not a legal opinion, a WCAG certificate or evidence of private analytics access. Baseline: `42f2eb3cb6fee502a528e889cda0b9db6ca369c2`. Concurrent content work through PR #267 is preserved.

## Content and source findings

The review inspected the 40-guide catalogue and detailed supplements for unsupported fixed amounts/deadlines, mandatory rules, authority mismatch, misleading completion claims and practical instructions. General recommendations are distinguished from verified legal requirements; the complete legal applicability of every page, calculator, privacy processing activity and individual case remains unverified.

Corrections:
- Passport for a child: ordinary application requires the child's presence for facial capture. The applicant/representative rules depend on age; medical exceptions are handled by the issuing office. The earlier repeated 'check whether presence is necessary' wording was insufficient. Source: https://www.slovensko.sk/sk/zivotne-situacie/zivotna-situacia/_cestovne-doklady-a-nahradne-ce . No new fee promise is published.
- Lost passport abroad: add explicit prompt reporting and the specific consular procedure, not the ministry homepage. Source: https://www.mzv.sk/sk/web/sk/sluzby/ak-cestujete-do-zahranicia/strata-alebo-odcudzenie-dokladov . A replacement document is not presented as unrestricted onward travel.
- Property purchase: replace a page explicitly aimed at foreigners with the general cadastral-procedure source. The distinction between an informational extract and an official document is retained. Source: https://www.slovensko.sk/sk/zivotne-situacie/zivotna-situacia/__katastralne-konanie . Contractual transfer by registration is also supported by https://www.slovensko.sk/sk/zivotne-situacie/zivotna-situacia/_kataster-nehnutelnosti .
- Leasing: use NBS's actual leasing explanation instead of treating an RPMN calculator as a complete authority for leasing ownership/contract types. Source: https://nbs.sk/dohlad-nad-financnym-trhom/ofs/financne-produkty/uvery/lizing/ .
- Death/inheritance: do not copy the obsolete funeral-grant amount from the older general Slovensko.sk overview. Link to https://www.employment.gov.sk/sk/rodina-socialna-pomoc/prispevok-pohreb/ for current conditions. Inheritance refusal is linked to Civil Code sections 463–470: https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/1964/40/ . No claim that debts or funds can be handled without legal authority is introduced.
- Charging: add an actual operator FAQ for practical payment/roaming/charging questions; its terms are explicitly operator-specific. https://zsedrive.sk/najcastejsie-otazky . Model-specific battery/electrical requirements still require manufacturer documentation and a qualified installer.
- PZP/STK: preserve PR #267's rule and add the actual primary announcement supporting the 1 October 2026 change: https://www.mindop.sk/media/tlacove-spravy/detail/od-oktobra-sa-bude-na-stk-kontrolovat-aj-povinne-zmluvne-poistenie .
- Home: correct the obsolete claim that the assistant is not generative. Local search and the optional online model mode are described separately.

Finance checks used the topic-specific NBS material already linked in the catalogue: equal-scenario/RPMN comparisons, refinancing costs and remaining maturity, household cash flow, availability of reserves, distinction between savings and investments and DSTI. No personalised borrowing approval, guaranteed returns, universal fee or universal interest rate is claimed.

### Three previously unresolved portals

| Portal | Evidence and action | Remaining limitation |
| --- | --- | --- |
| MV SR reservations | Official reservation instructions and official MV SR PDF identify the service. Replace a bare portal homepage link with the ministry's reservation instructions: https://pes.minv.sk/wps/wcm/connect/sk/site/main/Rezervacny-system/ | Successful search retrieval of official instructions is not a completed reservation or guaranteed access from every client. |
| ZRSR | Official DIVES provider page directly identifies and links www.zrsr.sk: https://www.ives.sk/portal/apv/cezir . The public search listing renders the registry search form and human-verification requirement. Add the provider information as a fallback; retain the actual register link. | Direct retrieval returned a gateway error. No CAPTCHA was bypassed and no company lookup is represented as completed. |
| MZVEZ | Specific travel and lost-document pages successfully retrieved: https://www.mzv.sk/cestovanie and the consular procedure above. Replace generic homepage links where relevant. | Retrieval verifies the information page, not an authenticated consular transaction or every destination-country rule. |

## Manual accessibility observations

Performed in Chromium with keyboard, accessibility tree and screenshots (not with a screen reader):
- Home skip link was the first keyboard stop, but its destination excluded H1 and primary search. Fix: one main landmark includes hero/search; the skip destination receives focus.
- Native browser zoom was tested at 200% (681 CSS px) and 400% (340 CSS px). There was no document-wide horizontal overflow on the inspected home view. At 400%, the opened menu extended below the 234 CSS-px viewport and had no internal scrolling. Fix: bound menu height and allow scrolling; preserve Escape and focus return.
- Calendar: native required-field validation focused the title input; add/status/remove worked. Removing the focused button moved focus to BODY. Fix: give each delete button a contextual name, announce removal and return focus to the title field. The synthetic calendar record was removed.
- Add repeatable browser regressions for these observations, including the last menu link at short viewport height. Explicit focus outlines also cover select, textarea and summary in both themes.

Not completed: assistive-technology speech output (NVDA/VoiceOver/Orca), full device/browser matrix, every WCAG/EN 301 549 criterion or a legal applicability opinion. The existing full automated axe scan is separate evidence, not a substitute for these checks.

## Search Console robots alert — 9 November

The supplied email does not contain affected URLs. The live robots.txt was inspected in the production browser. Cloudflare prepends managed AI crawler rules; the project rules allow `/` and disallow `/api/`. Googlebot has no specific disallow group. Google-Extended is separate from Google Search, as documented at https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers . No crawler protections were disabled merely to silence an email.

The exact affected URLs and last crawl date must be read in the Search Console Page indexing report. `/api/` exclusions can be intentional; a blocked public content URL would need individual diagnosis. Source rules and live Cloudflare delivery are distinguished. Public HTML/robots checks do not prove that Google has indexed a page.

## Operational access and branch protection

Cloudflare dashboard showed its sign-in page; private analytics, visitor p75 LCP/INP/CLS and traffic figures have not been read. No visitor numbers are invented.

GitHub still reports `main` unprotected. The rulesets API explicitly returned 403: 'Upgrade to GitHub Pro or make this repository public to enable this feature.' A supported plan and admin capability are prerequisites. Do not purchase a plan or publish the private repository without an explicit owner decision. Prepared target: PRs required, successful `verify` required, branch up to date, force pushes/deletion prohibited. For a solo owner, do not require an impossible second-person approval. The existing merge guard remains active but is not server-enforced protection.
