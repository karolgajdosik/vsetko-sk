# VŠETKO.sk – MVP 0.2

Statický portál Astro, bez plateného API a databázy.

## Lokálne spustenie

```bash
npm install
npm run dev
npm run build
```

## Cloudflare Pages

- Prepojte GitHub repozitár s Cloudflare Pages.
- Framework preset: **Astro**.
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: koreň projektu.
- Node.js: 22 (alebo aktuálna podporovaná LTS verzia).

## Obsah a vyhľadávanie

Vyhľadávací index: `src/data/search.json`. Každý výsledok odkazuje na existujúcu sekciu stránky. Všetky návody s právnym dopadom vyžadujú manuálne overenie aktuálnych pravidiel a presnejších oficiálnych zdrojov pred publikovaním.

## Pred spustením domény

Konfigurácia `astro.config.mjs`, kanonické URL, `robots.txt` a sitemap počítajú s `https://vsetko.sk`. Ak ešte doména nie je pripojená, produkčné SEO metadáta upravte podľa reálnej adresy. Pridajte Search Console a analytiku až po nasadení.

## Overenie

Spustite `npm run build` a otestujte vyhľadávanie, kalkulačky, odkazy a mobilné zobrazenie.
