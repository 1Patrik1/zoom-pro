# Zoom Pro — centrum upozornění a push

Tato změna přidává trvalé aplikační upozornění do PostgreSQL, API pro jejich čtení/označování, upozornění na nové zprávy v chatu podpory a napojení webového push předplatného na již existující PWA service worker.

## Architektura

- Frontend: Cloudflare Pages, apps/frontend.
- Backend: samostatný veřejně dostupný HTTPS backend (Express/PostgreSQL).
- Databáze: migrace 021_notifications.sql; migrace musí proběhnout před nasazením verze backendu, která používá tabulku Notification.
- Web push: backendové web-push + VAPID; registrace zařízení se ukládá přes /api/devices/register.
- Android/iOS aplikace: existující FCM cesta zůstává samostatná; vyžaduje správný Firebase projekt a registraci FCM tokenu z mobilního klienta.

## Nastavení před nasazením

### 1. Backend

Nastav na hostingu backendu jako secrets/environment variables (necommitovat do repozitáře):

- DATABASE_URL — produkční PostgreSQL.
- JWT_SECRET — unikátní náhodná hodnota, minimálně 32 znaků.
- CORS_ORIGIN — přesná origin adresa Cloudflare Pages/custom domain, případně další explicitně povolené klientské originy; nepoužívej * v produkci.
- VAPID_PUBLIC_KEY a VAPID_PRIVATE_KEY — pár vygenerovaný například příkazem 'npx web-push generate-vapid-keys'.
- VAPID_SUBJECT — kontaktní URI, například 'mailto:admin@zoom-pro.app'.
- Pro nativní FCM push navíc FCM_PROJECT_ID a FCM_SERVICE_ACCOUNT_JSON (nebo bezpečně uložený soubor service accountu).

Nikdy nevkládej privátní VAPID klíč ani Firebase service-account JSON do frontendových proměnných VITE_*, do repozitáře ani do logů. Frontend dostává pouze veřejný VAPID klíč přes endpoint /api/devices/public-key.

### 2. Cloudflare Pages

V nastavení Pages projektu přidej build-time proměnnou:

- VITE_API_URL = základní HTTPS URL samostatného backendu, bez koncového lomítka.

Po změně proměnné je potřeba vytvořit nový Pages deployment. Ověř, že backend povoluje přesnou origin frontendové domény v CORS_ORIGIN.

### 3. Databáze a pořadí nasazení

1. Vytvoř zálohu produkční databáze.
2. Zkontroluj CI a aplikuj číslované SQL migrace včetně 021_notifications.sql podle zavedeného postupu projektu.
3. Nasazuj backend, potom frontend.
4. Ověř přihlášení, GET /api/notifications, označení jedné notifikace i všech notifikací a zprávu v chatu podpory.
5. Na telefonu otevři web přes HTTPS, přihlas se, otevři centrum upozornění a stiskni ikonu telefonu. Uděl oprávnění a zkontroluj, že registrace zařízení proběhla.
6. Pošli testovací událost a ověř doručení, když je karta zavřená. Prohlížeč/OS může push omezovat podle nastavení úspory baterie nebo oprávnění.

## API

- GET /api/notifications?limit=30 — upozornění přihlášeného uživatele a počet nepřečtených.
- PATCH /api/notifications/:id/read — označí vlastní upozornění jako přečtené.
- POST /api/notifications/read-all — označí všechna vlastní upozornění jako přečtená.
- POST /api/notifications/broadcast — pouze SUPERADMIN; přijímá userIds (1–100 UUID), title, body, volitelný type a objekt data. Vytvoří trvalé záznamy a pokusí se o push.
- POST /api/devices/register — existující registrace zařízení; webová registrace posílá { platform: "web", pushSubscription: subscription.toJSON() }.

Upozornění jsou vždy čtena/označována podle ID přihlášeného uživatele. Hromadné odesílání je omezeno na roli SUPERADMIN.

## Testovací brána

Před merge/deploy musí být zelené:
- backendové unit testy včetně notifications-validation.test.js,
- frontendové unit testy,
- produkční build frontendu,
- CI migrace proti čisté PostgreSQL,
- ruční integrační test přes skutečný backend a telefon.

GitHub monitoring z PR #12 je samostatný: nastav repository variable ZOOM_PRO_HEALTH_URL na veřejnou HTTPS adresu backendu zakončenou /health. Úspěch CI sám o sobě nepotvrzuje, že je proměnná nastavená nebo že produkční push funguje.

## Co ještě není potvrzené

Kód v této větvi neznamená, že jsou produkční secrets, migrace, CORS ani push oprávnění už nastavené. Skutečné doručení push nelze potvrdit bez platných klíčů, přihlášeného zařízení a testu na nasazeném HTTPS webu. Zatím se trvalá aplikační upozornění vytvářejí při událostech chatu podpory; další doménové události (projekty, kolize, faktury, sklad) je potřeba připojit jednotlivě a pokrýt testy.
