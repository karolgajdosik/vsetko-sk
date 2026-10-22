# VŠETKO AI v3.8 – prevádzka a bezpečnosť

Táto verzia obsahuje UI na `/ai/` a Cloudflare Pages Function `POST /api/assistant`. **Bez explicitnej konfigurácie bindingov model nebeží** a API vráti HTTP 503. Stránka ponúkne odkaz na existujúci fulltext. Samotné zlúčenie kódu preto nespúšťa platené inference.

## Pred aktiváciou

1. V Cloudflare Pages projekte `vsetko-sk` skontrolujte aktuálne podmienky Workers AI, podporu modelu `@cf/meta/llama-3.1-8b-instruct`, limity a fakturáciu. Názov modelu je nutné overiť vo vašom účte.
2. Nastavte Pages Functions binding **AI** typu Workers AI.
3. Nastavte **WAF Rate Limiting** pravidlo na zóne vsetko24.sk pre cestu `/api/assistant`, s obmedzením podľa IP a akciou Block. Overte, že pravidlo skutočne zasahuje požiadavky na produkčnej doméne. Toto pravidlo **nechráni automaticky** preview adresy `*.pages.dev`; na nich nespúšťajte AI bez samostatnej ochrany. Rate limiting nie je garanciou nulových nákladov.
4. Nastavte v Cloudflare aj mesačný rozpočtový limit alebo alarm podľa dostupných možností účtu a overte správanie pri vyčerpaní bezplatného balíka.
5. Overte podmienky spracúvania údajov, prípadné prenosy, záznamy a informačné povinnosti podľa GDPR. Nevyžadujte od návštevníkov osobné údaje.
6. Vyskúšajte model, neznáme otázky, chyby 429/503, mobilné rozhranie a odkazy. Pred publikovaním ako produkčnej AI služby vykonajte bezpečnostný a obsahový audit.

## Limity a zásady

- Otázka má najviac 600 znakov, požiadavka najviac 4096 znakov; kontext tvoria iba serverom určené témy, nie obsah dodaný návštevníkom.
- Asistent je orientačný a nezaručuje právnu správnosť. Citované stránky sú odkazy na obsah portálu; nie sú automatickým overením aktuálneho zákona.
- Odpovede sa neukladajú do databázy portálu; poskytovateľ infraštruktúry môže spracúvať prevádzkové záznamy podľa vlastných podmienok.
- Limity zabezpečuje WAF na produkčnej doméne, nie Pages Function. Ochranu proti obchádzaniu cez `*.pages.dev` je nutné vyriešiť pred aktiváciou AI bindingu v Preview.
- Táto prvá verzia neobsahuje streamovanie, konverzačnú pamäť ani neobmedzené otvorené otázky. Obsahový katalóg je zámerne malý a serverom spravovaný.

## Rollback

Odstráňte binding `AI`; API bude odpovedať 503 bez vyvolania modelu. Fulltext `/hladat/` zostáva dostupný.
