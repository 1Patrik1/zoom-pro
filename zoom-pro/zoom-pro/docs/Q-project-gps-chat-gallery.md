# Q – Projekty: GPS, adresa, odchylka, fotochat, galerie

## Co je nově hotové

### Projekty
- založení i editace projektu už umí:
  - název stavby
  - kód zakázky
  - klienta
  - adresu stavby
  - GPS latitude / longitude
  - odchylku / toleranci od stavby v metrech
  - zdroj GPS (`MANUAL`, `AUTO`, `COMBINED`)
  - poznámku k lokaci
  - plánovaný start a konec
  - rozpočet a status
- z adresy lze dopočítat GPS
- z prohlížeče lze načíst aktuální GPS automaticky
- pro vybraný projekt se počítá aktuální odchylka od stavby pomocí Haversine formule
- odkaz do map je přímo v detailu projektu

### Chat a galerie
- projektový chat nově podporuje přidání až 4 fotek k jednomu příspěvku
- první fotka se zobrazí přímo v chatu
- všechny fotky se ukládají i do projektové galerie
- galerie je synchronizovaná přes `/api/sync`
- obrázky se na frontendu komprimují do JPEG data URL, takže není potřeba externí storage vrstva pro MVP běh

## Backend změny
- nová migrace `007_project_geo_and_gallery.sql`
- nový endpoint:
  - `POST /api/projects/update`
- rozšířený endpoint:
  - `POST /api/projects/chat` podporuje `attachments: string[]`
- sync vrací:
  - `projectGallery`

## Databáze
- `Project` rozšířen o:
  - `gpsMode`
  - `locationNote`
  - `locationUpdatedAt`
- `ProjectChat` rozšířen o:
  - `attachmentType`
  - `galleryCount`
- nová tabulka:
  - `ProjectGalleryItem`

## Poznámka k produkci
Aktuální řešení ukládá fotky jako data URL a je vhodné pro lokální nasazení / menší provoz. Pro ostrý větší provoz je vhodný další krok:
- upload do objektového úložiště (S3, Cloudflare R2, Supabase Storage)
- generování thumbnailů
- limit velikosti a případně EXIF cleanup na backendu
