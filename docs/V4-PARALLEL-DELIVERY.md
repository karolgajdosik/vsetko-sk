# V4.0 – paralelný vývoj

Vlastník schválil osem oblastí a 15. 11. 2026 výslovne požiadal spustiť ich paralelne bez opakovaných schválení bežných krokov. V3.0 je akceptovaná s výhradami v #335. Výnimky VYN-001 až 007 ostávajú prevádzkovými záväzkami.

## Spustené oblasti a prvý funkčný balík

| Oblasť | Backlog | Prvý balík | Vlastníctvo |
| --- | --- | --- | --- |
| A Profil | #336 | Lokálne preferencie, obľúbené odkazy, prehľad existujúcich úloh | moj-prehlad.astro, profile-*.mjs |
| B AI | #337 | Filter lokálnych výsledkov, nadväzujúce otázky | ai.astro, ai-*.mjs |
| C Kalendár | #338 | Šablóny povinností s vlastným dátumom, filtrovanie | kalendar.astro, calendar-*.mjs |
| D Dokumenty | #339 | Katalóg a filtrovanie existujúcich generátorov | dokumenty.astro, document-*.mjs |
| E Financie 360 | #340 | Cashflow, rezerva a vlastný záťažový scenár | financie/prehlad.astro, finance-*.mjs |
| F Auto 360 | #341 | Lokálne výdavky, súčty, cena/km a export | auto/moje-auto.astro, vehicle-*.mjs |
| G PWA | #342 | Manifest, inštalácia, bezpečná offline obrazovka | aplikacia.astro, manifest.webmanifest, pwa-* |
| H Porovnávače | #343 | Dve vlastné ponuky a transparentnosť prípadnej budúcej monetizácie | porovnavace.astro, comparison-*.mjs |

Tento balík začína všetkých osem oblastí; nie je vyhlásením úplného dokončenia V4.0. Externé partnerstvá, platby, synchronizácia účtov, upload citlivých dokumentov a natívne obchody s aplikáciami nie sú týmto balíkom aktivované.

## Pracovný režim

- V interaktívnej relácii paralelní pracovníci implementujú oddelené súbory; integrátor vlastní spoločné prepojenia, navigáciu, search, sitemap a vydanie.
- Existujúce tri hodinové automatizácie pokrývajú integráciu A/E/F/G/H, AI B a kalendár/dokumenty C/D. Pri dostupnej kapacite delegujú oddelené podúlohy paralelne. Nejde o nepretržitú prácu medzi behmi.
- Bez duplicitných PR; kontrolovať existujúce main/PR pred implementáciou. Koherentné balíky minimalizujú frontu a preteky pri merge.
- Bežný vývoj nečaká na opakované potvrdenie už schváleného rozsahu. Testy/build a existujúce bezpečnostné pravidlá platia naďalej.
- Výpadok externého API alebo chýbajúci prístup blokuje iba danú operáciu. Ostatné oblasti pokračujú.

## Vydanie a automatizácia

1. Lokálne a existujúce CI kontroly musia uspieť pre presný commit.
2. Aktuálny main, potvrdená bezkonfliktnosť, kompletný diff a žiadna nevyriešená požiadavka na zmeny.
3. Existujúci auto-merge bezpečných PR a Cloudflare Pages deployment bez nového schvaľovania bežných zmien.
4. Oddelene zaznamenať deploy SHA a produkčné HTTP/HTML/H1 i funkčné browser kontroly. Samotné CI alebo merge nie je produkčný dôkaz.
5. Citlivé CI/backend/config/oprávnenia/náklady nesmú obísť existujúce review. Žiadne platené AI API, nové závislosti, nákupy alebo zverejnenie repozitára.

## Prevádzkové a dátové hranice

Profil, kalendár a evidencia auta sú lokálne, bez serverovej synchronizácie. Financie a porovnávač neukladajú vstupy. Dokumenty zostávajú v prehliadači. Online asistent má existujúce pravidlá súkromia. PWA ukladá iba verejnú offline obrazovku a ikony; necachuje odpovede API ani používateľské dáta a nevykonáva push či background synchronizáciu.

Skutočné záverečné akceptačné dôkazy sa dopĺňajú do #336–343. Neoznačovať ich hromadne za dokončené po prvom balíku.
