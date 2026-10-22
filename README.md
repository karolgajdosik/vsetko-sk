# VŠETKO.sk – verzia 0.3

Nezávislý slovenský informačný portál postavený na Astro. Vychádza z MVP 0.2, zachováva všetky kalkulačky a sekcie.

## Lokálne spustenie

Vyžaduje Node.js 22 a npm:

```bash
npm install
npm run build
npm run dev
```

## Cloudflare Pages – GitHub integrácia

- Framework preset: **Astro**
- Build command: **npm run build**
- Build output directory: **dist**
- Root directory: `/` (ak je obsah projektu v koreni repozitára)
- Environment variable `NODE_VERSION`: `22`
- Voliteľne `SITE_URL`: `https://vsetko-sk.pages.dev` (predvolená hodnota)
- Voliteľne `PUBLIC_CF_ANALYTICS_TOKEN`: token z Cloudflare Web Analytics. Bez tokenu sa analytický skript nevkladá.

Po pripojení vlastnej domény nastavte `SITE_URL=https://vsetko.sk` a znovu spustite deployment. Overte, že `robots.txt`, `sitemap.xml` a canonical URL majú správnu doménu. Používajte jednu kanonickú doménu a podľa potreby nastavte presmerovania.

## Obsah a dôveryhodnosť

- Redakčný dátum **nie je právne overenie**; konkrétne postupy treba overiť voči oficiálnym dokumentom.
- Informačné zdroje sú odkazy na oficiálne inštitúcie, nie automatické potvrdenie jednotlivých tvrdení.
- Pred verejným marketingovým spustením doplňte prevádzkovateľa, skutočný kontakt a skontrolujte ochranu osobných údajov.
- `404.astro` vytvára vlastnú chybovú stránku.
- `sitemap.xml` a `robots.txt` sa generujú podľa `SITE_URL`.

## Testovanie po nasadení

1. Otvorte `/`, `/financie/`, `/auto/`, `/urady/`.
2. Skontrolujte obe kalkulačky a vyhľadávanie.
3. Otvorte `/robots.txt` a `/sitemap.xml`.
4. V zdrojovom kóde stránok overte canonical URL a metadáta.
5. Overte `/o-projekte/`, `/kontakt/`, `/ochrana-sukromia/` a neexistujúcu adresu (404).
6. Cloudflare Web Analytics aktivujte iba po doplnení tokenu a príslušných informácií o spracúvaní údajov.

Žiadne platené AI API ani serverová databáza nie sú potrebné.
