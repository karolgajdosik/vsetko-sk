# Audit technického dlhu – VŠETKO24.sk

- `package.json` má stále verziu 0.3.1 napriek vydaniu 0.5; zosúladiť vo vydaní 1.0.
- Chýba verzovaný lockfile; pre deterministický CI build pridať package-lock.json.
- `src/data/search.json` je ručne udržiavaný vedľa `guides.json`; zaviesť generovanie alebo validáciu proti duplicite.
- 15 návodov má len krátke kontrolné zoznamy; zlepšiť štruktúru a zdrojovanie.
- `src/pages/index.astro` obsahuje veľký inline vyhľadávací skript; extrahovať a testovať samostatne.
- Kalkulačky majú inline logiku bez unit testov; oddeliť čisté výpočtové funkcie.
- Zvážiť, ako sa má riešiť indexácia preview domény pages.dev; canonical na produkciu nestačí ako tvrdé blokovanie indexácie.
- Overiť, že Cloudflare Web Analytics nie je vložené dvakrát.
- SEO dátum `updated` je dátum redakčnej úpravy, nie potvrdenie legislatívnej aktuálnosti.
