# FINIS — go-live checklist

## Bezpečnost
- [ ] změněné `POSTGRES_PASSWORD`
- [ ] změněné `JWT_SECRET`
- [ ] omezený přístup na server jen přes SSH klíče
- [ ] vypnutý veřejný přístup na PostgreSQL port
- [ ] nastavený firewall pro 22 / 80 / 443

## Aplikace
- [ ] běží `postgres`
- [ ] proběhl `migrate` kontejner bez chyby
- [ ] běží `backend`
- [ ] běží `frontend`
- [ ] login SUPERADMIN funguje
- [ ] `/api/sync` vrací data
- [ ] dokumenty se načítají
- [ ] importy se načítají
- [ ] exporty se načítají
- [ ] podpisy se načítají

## Doména a dostupnost
- [ ] doména směřuje na správný VPS
- [ ] `CORS_ORIGIN` odpovídá veřejné URL
- [ ] frontend je veřejně dostupný
- [ ] API je dostupné přes reverse proxy `/api`
- [ ] vyřešené HTTPS

## Data
- [ ] proběhla počáteční seed inicializace
- [ ] ověřený SUPERADMIN účet
- [ ] udělaná první záloha DB
- [ ] připravený postup pro obnovu DB

## Provoz
- [ ] uložené deploy instrukce
- [ ] uložené přístupy k serveru
- [ ] uložené přístupy k DNS / doméně
- [ ] rozhodnutý update postup
- [ ] rozhodnutý rollback postup
