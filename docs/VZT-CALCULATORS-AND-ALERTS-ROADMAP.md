# Plán: VZT kalkulačky, upozornění a provoz mimo otevřenou aplikaci

Cíl: bezpečně rozšířit `1Patrik1/zoom-pro` bez přímého zásahu do `main`. Práce probíhá ve větvi `feature/vzt-calculator-alerts`.

## 1. Priorita P0 — správnost a srozumitelná upozornění
- Validovat vstupy kalkulaček: konečné číslo, kladné rozměry a průtoky, nezáporné délky a počty armatur, rozumné limity.
- Rozlišit varování (výsledek je vypočitatelný, ale podezřelý) od chyby (výsledek nelze spolehlivě vypočítat).
- Zobrazovat konkrétní důvod, dopad a doporučenou opravu; nevydávat nulový/nahrazený výsledek za správný výpočet.
- Po zaokrouhlení rozměru na výrobní krok přepočítat skutečnou rychlost a zobrazit odchylku od cílové rychlosti.
- Ověřit vzorce a předpoklady pro místní odpory, geometrii tvarovek, rozvin plechu a odhad spotřeby. Součinitele musí být konfigurovatelné a označené jako odhad, dokud nejsou ověřeny pro konkrétní tvarovku/systém.
- Přidat jednotkové a regresní testy včetně nulových, mezních a neplatných vstupů.

## 2. Priorita P1 — montážní kalkulačka
- Odsazení pro úhly 15/30/45/60°, kontrola minimálního přesahu a délky mezikusu.
- Jasně oddělit celkový osový rozměr, projekci, řeznou délku a přídavky na spoje.
- Kótovaný náčrt; výkaz dílů a materiálu s rezervou odpadu nastavitelnou uživatelem.
- Export PDF/CSV/XLSX a uložení výpočtu k zakázce/místnosti.

## 3. Priorita P1 — jednotný výpočtový engine
- Oddělit čisté výpočty od React UI; zachovat stávající API nebo dodat kompatibilní adaptéry.
- Jeden zdroj výpočtů pro kalkulačky, 3D trasu, kusovník a export.
- Uložit verzi výpočetního algoritmu, vstupy, jednotky, výstupy a datum výpočtu pro auditovatelnost.

## 4. Upozornění, když je aplikace zavřená
Aplikace vypnutá v prohlížeči nemůže sama spouštět JavaScript ani posílat upozornění. Je nutná služba běžící nezávisle na telefonu/PC:
- GitHub Actions nebo externí monitor kontroluje dostupnost nasazeného backendu přes HTTPS health endpoint.
- Pro aktivní upozornění se nastaví repository variable `ZOOM_PRO_HEALTH_URL` na veřejnou HTTPS adresu endpointu `/health` (ne localhost).
- Při chybě běhu se použijí GitHub Actions notifications; pro push/e-mail do telefonu je potřeba nakonfigurovat notifikační kanál nebo externí monitorovací službu.
- Upozornění na aplikační události (např. neuložený výpočet, chyba synchronizace, termín úkolu) vyžadují backend/queue a uložené preference uživatele; pro push navíc Web Push/VAPID nebo odpovídající mobilní push službu.
- Nikdy nevkládat tokeny, hesla, VAPID private key ani databázové údaje do repozitáře. Použít GitHub Secrets.
- Nezaměňovat dostupnost serveru za dostupnost frontendové aplikace nebo správnost výpočtů.

## 5. Akceptační podmínky
- Frontend build a testy projdou.
- Výpočty mají referenční příklady a validaci neplatných vstupů.
- Upozornění mají jasnou závažnost, vysvětlení a doporučenou akci.
- Monitor běží nezávisle na otevření aplikace a ověřuje skutečný nasazený endpoint.
- Změny jsou v samostatné větvi a jdou přes Pull Request; žádné automatické sloučení do main bez kontroly CI a diffu.
