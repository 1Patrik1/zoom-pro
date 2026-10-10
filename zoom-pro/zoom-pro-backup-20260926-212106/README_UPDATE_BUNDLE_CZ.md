# Zoom Pro — Update balík (one-shot)

Toto je **jeden update balík**, který obsahuje celý aktuální stav všech dosavadních úprav.

## Jeden příkaz
Nejjednodušší použití:

```bash
cd /cesta/k/zoom-pro
bash ./zoom-pro-update-all-20260925.sh
```

Když skript spouštíš odjinud:

```bash
bash zoom-pro-update-all-20260925.sh /cesta/k/zoom-pro
```

## Co udělá automaticky
- vytvoří zálohu souborů projektu
- pokusí se vytvořit zálohu PostgreSQL databáze
- nakopíruje všechny nové / upravené soubory
- spustí `npm install` v rootu a v `apps/mobile`
- pokusí se spustit DB migrace
- zkontroluje syntaxi backendu a skriptů
- postaví frontend build

## Bezpečné varianty
Jen simulace bez instalace a bez DB:

```bash
bash zoom-pro-update-all-20260925.sh /cesta/k/zoom-pro --dry-run
```

Bez DB kroků:

```bash
bash zoom-pro-update-all-20260925.sh /cesta/k/zoom-pro --skip-db
```

## Poznámka
Skript **nepřepisuje `.env`**. Tvoje konfigurace zůstane zachovaná.
