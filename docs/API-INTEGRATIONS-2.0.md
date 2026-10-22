# VŠETKO24.sk 2.0 – katalóg API a architektúra

## Zásady
- Žiadne platené API bez explicitného schválenia.
- Každý zdroj má stav: ready / key-required / evaluate. Nie je automaticky integrovaný iba preto, že má URL.
- Každá dátová karta ukazuje zdroj, dátum pozorovania, čas načítania a stav dostupnosti.
- Kľúče sa nikdy neukladajú do verejného repozitára ani do JavaScriptu prehliadača.
- Cache, rate limiting, fallback pri výpadku; bez zbytočného zberu osobných údajov.

## Prioritizácia
1. ECB – referenčné kurzy, verejné SDMX REST API, bez kľúča. Prvá implementácia: výmenné kurzy USD, CZK, GBP a PLN voči EUR.
2. ŠÚ SR RPO – vyhľadávanie organizácií; verejný REST API, bez registrácie. Najskôr overiť formát a politiku CORS/cache.
3. ŠÚ SR DATAcube – štatistiky inflácie, obyvateľstva, práce, dátové rady cez REST API.
4. Open Charge Map – lokality nabíjania, bezplatný API kľúč vyžaduje registráciu; nikdy neprezentovať lokality ako dostupnosť konektorov v reálnom čase.
5. Open-Meteo – iba nekomerčný free tier; reklamy/monetizácia by si vyžiadali inú licenciu.
6. NBS – hypotekárne a bankové štatistiky; pred implementáciou vybrať presnú časovú radu a jej licenciu.
7. eZnamka, kataster, slovensko.sk, dopravné dáta – pred implementáciou overiť dostupné oficiálne strojové rozhrania; bez scrapingových obchádzok.

## Architektúra
- Astro statické stránky a Cloudflare Pages.
- Verejné endpointy bez kľúčov: priama požiadavka klienta len ak to CORS a licencie povoľujú.
- Inak Cloudflare Pages Functions s allowlistom upstream domén, cache a validáciou parametrov (bez otvoreného proxy).
- API integrácie oddelené od návodov a kalkulačiek; výpadok dát nezablokuje portál.
- Pre dátové rady používať dátum publikácie, nie označenie „aktuálne“ bez overenia.

## Dokumentácia
- ECB: https://data.ecb.europa.eu/help/api/data
- RPO: https://susrrpo.docs.apiary.io/
- DATAcube: https://data.statistics.sk/api/html/help-en.html
- Open Charge Map: https://www.openchargemap.org/develop/api
- Open-Meteo podmienky: https://open-meteo.com/en/terms

## Dôležitá aktualizácia 22. 10. 2026
- DATAcube exporty sa prestali aktualizovať 15. 9. 2026; ďalšie štatistiky riešiť cez STATdata a overiť nový dátový kontrakt: https://data.statistics.sk/api/.
- RPO MVP: GET /api/rpo?ico=XXXXXXXX; iba 8 číslic, serverová validácia, výstup bez osobných údajov štatutárov. Pred finálnym vydaním overiť reálnu schému a funkčný test na Cloudflare preview.
