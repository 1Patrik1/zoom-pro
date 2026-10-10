# L — Frontend pages pro Documents / Imports / Exports / Signatures

Tento dokument popisuje nově připravené frontend stránky a jejich přesné soubory.

Přímo v balíku jsou už vytvořené tyto implementace:

- `apps/frontend/src/features/documents/DocumentsPage.jsx`
- `apps/frontend/src/features/imports/ImportsPage.jsx`
- `apps/frontend/src/features/exports/ExportsPage.jsx`
- `apps/frontend/src/features/signatures/SignaturesPage.jsx`

Současně byla rozšířena navigace a hlavní `App.jsx`, aby se nové stránky daly otevřít přímo z PWA UI.

---

## 1. Co bylo upraveno navíc

## `apps/frontend/src/config/nav.config.js`
Doplněné nové taby:
- `documents`
- `imports`
- `exports`
- `signatures`

## `apps/frontend/src/App.jsx`
Doplněné importy a render větve pro nové stránky.

---

## 2. Documents page

## Soubor
`apps/frontend/src/features/documents/DocumentsPage.jsx`

## Co stránka umí
- načíst seznam dokumentů přes `GET /api/documents`
- filtrovat podle `status` a `documentType`
- vytvořit nový dokument přes `POST /api/documents`
- schválit dokument přes `POST /api/documents/:id/approve`
- zobrazit základní KPI: total / approved / draft

## Co očekává od backendu
- token v props
- dostupný documents endpoint
- enum typů dokumentů v DB

## Typické použití
- interní dokumenty
- nabídky
- reporty
- podklady pro další export / podpis

---

## 3. Imports page

## Soubor
`apps/frontend/src/features/imports/ImportsPage.jsx`

## Co stránka umí
- načíst import profily přes `GET /api/imports/profiles`
- načíst historii import jobů přes `GET /api/imports/jobs`
- založit nový import job přes `POST /api/imports/jobs`

## Co je zatím skeleton
- upload souboru se zatím řeší jen URL / metadata formou
- preview řádků zatím není implementované
- status pipeline zatím není workerově rozvedená

---

## 4. Exports page

## Soubor
`apps/frontend/src/features/exports/ExportsPage.jsx`

## Co stránka umí
- načíst export profily přes `GET /api/exports/profiles`
- načíst historii export jobů přes `GET /api/exports/jobs`
- založit nový export job přes `POST /api/exports/jobs`
- vybrat `format` (`PDF`, `DOCX`, `XLSX`)
- zadat základní filtry

## Co je zatím skeleton
- nevytváří ještě finální soubor ke stažení
- neukazuje artifact URL
- worker processing zatím není napojený

---

## 5. Signatures page

## Soubor
`apps/frontend/src/features/signatures/SignaturesPage.jsx`

## Co stránka umí
- načíst providers přes `GET /api/signatures/providers`
- vytvořit podpisovou žádost přes `POST /api/signatures/requests`
- zvolit `signatureLevel`
- zadat signer data
- zobrazit provider list a stav aktivity

## Co je zatím skeleton
- zatím neukazuje historii signature requests
- nemá webhook status refresh
- nemá artifact download / signed file preview

---

## 6. Přesné napojení na App shell

Nové stránky jsou už napojené do:
- `NAV_ITEMS`
- `App.jsx` switch renderu

Tedy po rozběhnutí appky jsou součástí stejné PWA navigace jako ostatní moduly.

---

## 7. Doporučený další krok pro L

### Documents
- detail page `DocumentDetailPage.jsx`
- template picker
- preview renderer

### Imports
- file upload
- preview rows
- validation report
- per-row error list

### Exports
- job detail
- artifact download button
- signed export flow

### Signatures
- requests list
- request detail
- status timeline
- signed artifact preview

---

## 8. Shrnutí L

L je v balíku připravené nejen jako návrh, ale jako **reálné frontend soubory**, které už jsou zapsané v projektu.

To znamená, že další práce už není „vymyslet architekturu“, ale:
- rozběhnout to,
- napojit seeded data,
- doplnit worker / artifact logiku,
- a udělat detailní pages druhé úrovně.
