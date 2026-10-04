# S – Docházka s GPS kontrolou stavby + fotky ve stavebním deníku

## Co je nově hotové

### Docházka
- docházka nově umí vybrat konkrétní projekt / stavbu
- při příchodu a odchodu se načte GPS z telefonu / prohlížeče
- backend porovná GPS polohu zaměstnance s GPS stavby
- ukládá se:
  - `distanceFromProjectM`
  - `withinProjectRadius`
  - `geoStatus`
  - snapshot tolerance a adresy stavby
- výsledky mají stavy:
  - `OK`
  - `OUT_OF_RADIUS`
  - `NO_GPS`
  - `PROJECT_WITHOUT_GPS`
  - `NO_PROJECT`
- dashboard a reporty už ukazují i docházku mimo toleranci stavby

### Stavební deník
- k dennímu zápisu lze přidat až 4 fotky
- fotky se komprimují na frontendu a ukládají se do `attachments`
- v seznamu deníku se zobrazují přímo jako náhledy
- kliknutím se otevře větší náhled

## Databáze
Nová migrace `009_attendance_geo_guard_and_log_media.sql` rozšiřuje tabulku `Attendance` o:
- `distanceFromProjectM`
- `withinProjectRadius`
- `geoStatus`
- `projectRadiusSnapshot`
- `projectAddressSnapshot`

## Praktický dopad
Tímhle je systém zase o kus blíž ostrému provozu:
- vedoucí vidí, kdo byl opravdu na stavbě
- zaměstnanec může doložit denní práci fotkou
- reporty mají lepší podklad pro kontrolu i následné interní fakturace
