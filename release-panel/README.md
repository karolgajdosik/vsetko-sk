# VŠETKO24.sk · Kontrola vydania

Súkromný panel v Sites sleduje GitHub karolgajdosik/vsetko-sk a verejnú produkciu na vsetko24.sk, ktorú obsluhuje Cloudflare Pages. Panel používa Vinext, Cloudflare Worker a D1. Na vyhodnotenie používa deterministické pravidlá.

## Prevádzka

Tlačidlo **Spustiť kontrolu** vyžiada na serveri sedem V3 stránok a tri trasy jadra. Kontroluje cieľovú doménu, HTTP 200, obsahový typ, HTML element a presný H1 podľa kontraktu z PR 182. Výsledok obsahuje čas, nameraný text, konečnú URL a samostatný DNS údaj. Produkčný SHA pochádza z plného identifikátora na /version.json pred aj po meraní alebo z konzistentných hlavičiek stránok. Kontrola neuzatvára GitHub issues. Každý report má samostatné ID, záznam aktuálnej revízie GitHubu a rozhodnutie v čase merania.

## Privátna aktualizácia z GitHubu

Vlastníkom autorizovaná cloudová úloha číta GitHub cez jeho pripojenie. Pre tento súkromný Site získa aktuálnu adresu a prístup zo Sites get_site. Pri zmene publika najskôr skontrolujte prístup k údajom. Použite hlavičku OAI-Sites-Authorization s krátkodobým bearerom iba pre navrátený origin, bez presmerovaní. Do logov ani do zdrojového kódu sa bearer nevkladá.

1. GET /api/sync vráti verzovaný plán čítania. Každá položka uvádza kľúč, jedno z povolených GitHub čítaní a argumenty. Spustite phase1 iba pre uvedený repozitár. Uchovajte structuredContent pod zodpovedajúcim kľúčom.
2. Z pr.head_sha a JSON.parse(commits.content)[0].sha získajte hodnoty pre phase2. Zachovajte celý GitHub výsledok aj pri REST obálke s poľom content. Chyby čítania nezapisujte ako prázdne údaje.
3. POST /api/sync s application/json, X-Release-Sync: 1 a telom {startedAt,sources}. startedAt je UTC čas začatia zberu, sources obsahuje výsledky oboch fáz. Staršia snímka neprepíše novšiu. Pri prekročení limitu zoznamu integrácia požiada o nový úplný zber.
4. POST /api/check s application/json a {id} (jedno UUID pre kontrolu aj jej opakovanie). GET /api/state overí uložené repo.main, checked, výsledky trás a ďalší krok. Pri zlyhaní čítania GitHubu vykonajte produkčnú sondu proti poslednej dostupnej snímke a výslovne uveďte neaktuálny zdroj.
5. Počas synchronizácie sa nevolajú zápisové GitHub operácie. Zmena klasifikácie úlohy v rozhraní sa ukladá iba v D1. Pred publikáciou a počas používania musí tento panel zostať prístupný len vlastníkovi.

## Zostavenie

Node 22.13 alebo novší. Nainštalujte závislosti z package-lock.json. npm run dev spustí vývojový server. npm run build vytvorí Worker. Hosting manifest deklaruje DB. Schému a migrácie obsahujú db/ a drizzle/. Server nasadzuje Sites a zároveň aplikuje migrácie. GitHub vetva panela nevyžaduje zmenu deploy workflow portálu.
