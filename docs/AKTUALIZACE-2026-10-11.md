# Aktualizace projektu — 11. 10. 2026

> Stav k 2026-10-24: ověřený souhrn změn po 11. 10. a bezpečných dalších kroků je v [aktuální audit k 2026-10-24](docs/REPOSITORY-AUDIT-2026-10-24.md). Tento dokument zůstává časovým snímkem.

Tento přehled doplňuje starší instalační a auditní dokumenty. Popisuje aktuální změny v pracovním stromu a stav jejich připravenosti; sám o sobě nepotvrzuje nasazení na server ani průchod integračními testy.

## Funkce a související části

- **Projekty:** správa a mazání projektů, samostatná položka navigace pro projektový chat.
- **Docházka:** projektové přiřazení a práce s docházkovými záznamy; montér oznamuje nemoc nebo dovolenou, vedoucí může změnit přiřazený projekt.
- **Profil a firma:** jméno, příjmení, e-mail, telefon, IČO/DIČ a adresa firmy; podnikatelské údaje člena jsou volitelné podle interního/externího typu.
- **Podpora a licence:** firemní chat podpory se SUPERADMINem, žádosti o tarif a příplatkové moduly, detail licence/členů firmy v platformní administraci. Firma si licenci sama neaktivuje.
- **Registrace:** registrace nové firmy upozorní registrované SUPERADMIN účty; žádost nového člena upozorní ředitele dané firmy.
- **Sklad a QR:** kamera/QR tok ve skladu má být dostupný z modulu Sklad; ruční hledání položky je alternativní cesta.
- **Kalkulačka:** VZT výpočty, kreslení tras a místností a vizualizace propojených částí VZT/topení/vody s možností jejich samostatného zobrazení.
- **Dokumenty, importy, exporty, podpisy:** rozhraní obsahuje české názvy dostupných typů, stavů, modulů a formátů. Importní „zkušební režim“ se eviduje jako příznak úlohy; skutečné parsování souboru a transakční import je samostatná funkce backendu.
- **Alarm a mobilní upozornění:** výběr melodie webového i mobilního alarmu; push o projektovém chatu, podpoře, žádostech o licenci a registracích firem/členů.
- **Platební brána:** panel v Platformě ukládá poskytovatele, prostředí a měnu. Zatím neexistuje napojený checkout, zpracování platby, automatická úhrada ani webhook, který by měnil stav licence.

## Databázové migrace 017–020

| Migrace | Účel |
| --- | --- |
| `017_company_support_chat.sql` | Tabulka zpráv chatu podpory mezi firmou a účtem, který zprávu vytvořil. |
| `018_license_requests.sql` | Pole žádosti o licenci, údaje o vyřízení a index otevřených žádostí. |
| `019_company_member_business_details.sql` | Firemní a volitelné externí členské identifikační a adresní údaje. |
| `020_payment_gateway_settings.sql` | Bezpečný výchozí záznam `paymentGateway` v `PlatformSetting`; bez tajných klíčů a bez aktivace plateb. |

Migrace `020` nemění tabulkovou strukturu, pouze vloží výchozí JSON nastavení přes `ON CONFLICT DO NOTHING`. Předchozí verze schématu podporují také migrace `015` a `016`.

## Migrace 021 — notifikace

Kořenová migrace `021_notifications.sql` přidává databázovou podporu pro centrum notifikací. Před nasazením ověř zálohu, výsledek CI a stav migrace v cílové databázi; tento dokument nepotvrzuje její aplikaci na produkci.

## Aplikace změn databáze

Před produkční aktualizací pořiď zálohu:

```bash
npm run db:backup
npm run db:migrate:all
```

Hlavní migrátor automaticky seřadí všechny kořenové `NNN_*.sql`, zavede evidenci `_migrations` a při skutečné chybě vrátí nenulový exit kód. `npm run db:migrate:new` a `npm run db:migrate:legacy` jsou aliasy stejného migrátoru. `db-run-sql.mjs` zůstává nástrojem pro ruční SQL a migrace jím spuštěné se automaticky neevidují.

Staré pomocné vstupy `safe-db-update.cjs` a `patch-db.js` už neprovádějí vlastní ALTER skripty; delegují na tento řazený migrátor, aby nevznikly dvě různé cesty změn schématu.

Produkční `docker-compose.prod.yml` spustí migrátor jednorázovou službou před backendem. Instalátor Termuxu používá tentýž migrátor. Skripty migrace samy nebyly v rámci této dokumentační aktualizace spuštěny proti žádné databázi.

## Push konfigurace

Backend vyžaduje `FCM_PROJECT_ID` a `FCM_SERVICE_ACCOUNT_JSON`. Docker Compose předává tyto proměnné backend kontejneru z kořenového `.env`. Service-account JSON ukládejte jako chráněné tajemství; necommitujte jej a nevkládejte do platformního JSON nastavení.

Android/iOS aplikace navíc vyžaduje odpovídající nativní konfiguraci Firebase/APNs. Uživatel musí v mobilním **Nastavení → Notifikace** povolit push a telefon zaregistrovat. Při vypnuté/nezaregistrované FCM konfiguraci se žádná push zpráva nedoručí. Upozornění SMS, PWA web push a upozornění na novinky (samostatný news modul zatím není) nejsou součástí aktuální integrace.

## Příprava platební brány

V **Platforma → Platební brána** lze vybrat předvolbu poskytovatele, testovací/produkční prostředí a měnu. Výběr není potvrzením obchodních podmínek ani aktivací živých plateb. Před implementací další fáze je třeba určit poskytovatele; tajné klíče pak patří do zabezpečeného úložiště serveru, následovat bude checkout, ověření podpisu webhooku, idempotence událostí a bezpečná aktualizace licence.

## Rychlá orientace v kódu

- Webová navigace a obrazovky: `apps/frontend/src/config/nav.config.js`, `apps/frontend/src/App.jsx`, `apps/frontend/src/features/`.
- API a služby: `apps/backend/src/app.js`, `apps/backend/src/routes/`, `apps/backend/src/services/`.
- Mobilní oznámení: `apps/mobile/src/lib/push.js`, `apps/mobile/src/screens/SettingsScreen.jsx`.
- Schéma a migrace: `schema.prisma`, soubory `001_*.sql`–`021_*.sql`.

