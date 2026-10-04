# Zoom Pro Montér — mobilní aplikace

Nativní Android/iOS + PWA aplikace pro montéry postavená na **Capacitor 6 + React 18 + Vite + Tailwind**.

## Funkce
- 🔐 **Přihlášení** proti Zoom Pro backendu (JWT)
- ⏰ **Docházka s GPS** (foreground + background location, kontrola radiusu)
- 📖 **Deník** s fotkami z kamery (offline queue)
- 📷 **AI AutoDetect** — foto → Gemini Vision změří chybějící kus (Ø, sklon, přesah)
- 🧾 **Můj výkaz** (Montér) — hodiny × sazba
- 🏗️ **Projekty** s navigací (Google Maps deep link)
- 🔄 **Offline queue** (IndexedDB) — vše se pak sesynchronizuje jedním klikem
- 🔔 **Push + lokální notifikace**
- 📴 **PWA** — jde nainstalovat i z prohlížeče bez Play Store

## Struktura
```
apps/mobile/
├─ src/
│  ├─ App.jsx              # root + navigace
│  ├─ main.jsx
│  ├─ components/TabBar.jsx
│  ├─ screens/             # Home, Login, Attendance, DailyLog, AutoDetect, Invoices, Projects, Sync, Settings
│  ├─ lib/                 # api.js, storage.js, media.js
│  └─ styles/index.css
├─ android/AndroidManifest.xml
├─ capacitor.config.json
├─ package.json
├─ tailwind.config.js
└─ vite.config.js
```

## Instalace
```bash
cd apps/mobile
npm install
npx cap add android      # jednorázově
npx cap add ios          # jednorázově (macOS)
```

## Development
```bash
npm run dev              # spustí Vite dev server (PWA v prohlížeči)
```

## Build Android APK
```bash
npm run android:apk      # vygeneruje android/app/build/outputs/apk/debug/app-debug.apk
```

Nebo přes Android Studio:
```bash
npm run cap:android      # otevře projekt v Android Studiu
```

## Build iOS
```bash
npm run cap:ios          # otevře v Xcode, tam Archive → App Store / TestFlight
```

## Konfigurace backendu
Po prvním spuštění nastav v aplikaci **Server URL** (Login → Server URL). Default: `https://api.zoom-pro.app`.

Backend musí povolit CORS z `capacitor://localhost` a `https://localhost`:
```js
// apps/backend/.env
CORS_ORIGIN=http://localhost:5173,capacitor://localhost,https://localhost
```

## Podepsání APK pro Play Store
```bash
cd android
keytool -genkey -v -keystore zoom-pro.keystore -alias zoom-pro -keyalg RSA -keysize 2048 -validity 10000
./gradlew bundleRelease   # vytvoří app-release.aab pro Play Console
```

## Publikace
- **Play Store**: nahraj `app-release.aab` do Play Console
- **App Store**: v Xcode Product → Archive → Distribute → App Store Connect
- **Direct APK**: sdílíš `app-debug.apk` (např. přes web / QR kód)
- **PWA**: uživatel klikne "Přidat na plochu" v prohlížeči
