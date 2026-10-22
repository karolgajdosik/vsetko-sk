# VŠETKO24.sk 1.0 – produktový rozsah a akceptácia

## Východiskový stav (audit 22. 10. 2026)
Astro statický web na Cloudflare Pages. Tri hlavné kategórie, 15 samostatných stručných návodov, vyhľadávanie s návrhmi, hypotekárna kalkulačka, rozpočet a náklady na auto. Existujúce URL zachovať.

## Cieľ vydania
- Celkovo aspoň 18 reálne použiteľných nástrojov (nie iba informačné karty).
- Celkovo aspoň 40 obsahovo overených praktických návodov.
- Katalóg nástrojov s filtrovaním podľa kategórií.
- Vylepšené vyhľadávanie s prácou so synonymami a prázdnymi výsledkami.
- Jednotný dizajn a prístupnosť mobil/desktop.
- Automatizované testy výpočtov, navigácie, SEO a Astro buildu.
- 0 € dodatočné prevádzkové náklady; bez AI API a databázy.

## Prioritné nástroje
Financie: hypotéka, rodinný rozpočet, refinancovanie, splátka spotrebného úveru, dostupnosť hypotéky (orientačná), finančná rezerva, sporenie, zložené úročenie, inflácia, čistá/hrubá mzda (iba po legislatívnom overení).
Auto: náklady na auto, EV vs. spaľovacie auto, náklady na cestu, cena nabíjania, leasing, amortizácia, servisný rozpočet, termínová pomôcka STK/EK (bez neoverených zákonných lehôt).
Zoznam možno upraviť podľa výsledkov testov, ale počet funkčných nástrojov musí byť doložený.

## Obsahové pravidlá
Každý návod: zrozumiteľný postup, komu je určený, podklady, relevantné úradné zdroje s konkrétnou URL, dátum redakčného overenia, súvisiace nástroje. Nepoužívať všeobecnú domovskú stránku úradu ako dôkaz konkrétneho právneho tvrdenia. Neoverené údaje označiť a nezverejňovať ako fakt.

## Kritériá pre jeden finálny PR
1. `npm ci && npm run build` úspešné v CI.
2. Automatické testy výpočtov a kontrola interných odkazov.
3. Funkčné stránky a kalkulačky na Cloudflare preview.
4. Sitemap, canonical, robots a štruktúrované dáta skontrolované.
5. Základná prístupnosť: klávesnica, labely, kontrast, mobil.
6. Obsahové overenie legislatívne citlivých informácií.
7. Bez zásahu do produkčnej vetvy pred schválením.
8. Jedno finálne akceptačné kolo, chyby opravovať v tej istej vetve.

## Organizácia
Jedna integračná vetva `release/v1.0-platform`, priebežné commity, jeden finálny Pull Request. Väčšie vydanie neznamená vypnutie priebežných testov. Zmeny publikovať až po akceptácii.
