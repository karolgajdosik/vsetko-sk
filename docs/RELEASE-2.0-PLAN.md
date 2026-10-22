# VŠETKO24.sk 2.0 – plán vydania

## Princípy
- Jeden integračný branch a jeden PR, bez zmien produkčného main pred schválením.
- Nulové pravidelné náklady: Astro, Cloudflare Pages free, statické dáta, bez plateného AI API a databázy.
- Neoznačovať pravidlového sprievodcu ako generatívnu AI. Neuvádzať neoverené právne lehoty alebo poplatky.

## Ciele a akceptácia
1. Inteligentný sprievodca: minimálne 15 konkrétnych životných scenárov, viacstupňové otázky, súvisiace návody a kalkulačky, bez ukladania osobných údajov.
2. Kalkulačky: z 18 na 30; každá s jednotkami, testami a popisom predpokladov. Legislatívne výpočty iba s overenými parametrami a dátumom účinnosti.
3. Návody: z 40 na 100; individuálne užitočné postupy, presné oficiálne zdroje, kontrola duplicít, dátum aktualizácie a transparentné upozornenia.
4. Auto a EV: rozšírené náklady vlastníctva, EV vs. spaľovacie auto, plánovanie nabíjania bez falošných live cien.
5. Aktuálne informácie: iba overené oficiálne zdroje, zdokumentovaný aktualizačný proces a bezpečný fallback, ak automatický import nefunguje.
6. UX, SEO, dostupnosť: mobilné ovládanie, interné prepojenia, sitemap, kontrola kontrastu a klávesnice.

## Etapy
- A: Technický základ a interaktívny sprievodca.
- B: Nové kalkulačky, validácia a regresné testy.
- C: Rozšírenie a overenie 60 nových návodov.
- D: Oficiálne aktuality, mobilný audit, SEO a akceptačné testy.

## Release gate
Automatické testy a Cloudflare preview musia prejsť; používateľ odsúhlasí finálne vydanie pred merge.
