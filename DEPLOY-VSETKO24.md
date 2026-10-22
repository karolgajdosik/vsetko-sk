# VŠETKO24.sk – nasadenie v0.3.1

1. Aktualizuj existujúci GitHub repozitár vsetko-sk, nie nový projekt.
2. Cloudflare Pages automaticky zostaví projekt cez npm run build, výstup dist.
3. Skontroluj https://vsetko24.sk/, https://vsetko24.sk/robots.txt a https://vsetko24.sk/sitemap.xml.
4. Sitemap musí obsahovať iba https://vsetko24.sk/...; canonical na jednotlivých stránkach tiež.
5. Google Search Console: Domain vsetko24.sk, TXT overenie v Cloudflare DNS, potom odošli sitemap.xml.
6. Cloudflare Pages Web Analytics už bolo zapnuté automaticky: nepridávaj PUBLIC_CF_ANALYTICS_TOKEN, ak nepoužívaš manuálnu integráciu.
7. Testovaciu adresu pages.dev neodosielaj do Search Console; táto verzia ju automaticky neblokuje.
8. Pred zlúčením over úspešné zostavenie a funkčnosť na preview URL.
