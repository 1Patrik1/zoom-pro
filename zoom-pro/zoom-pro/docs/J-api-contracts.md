# J — API kontrakty pro Zoom Pro

Tento dokument popisuje přesné request/response kontrakty podle aktuálně připraveného backend refaktoru v `apps/backend/src/routes`, `services` a `repositories`.

Důležitá poznámka: toto je **aktuální technický kontrakt refactor skeletonu**, ne finální enterprise OpenAPI specifikace. U některých endpointů je vhodné doplnit request validaci, capability middleware a detailnější error model.

---

## 1. Společná pravidla API

## Base URL
- lokálně typicky `http://localhost:5000`

## Content-Type
- `application/json`

## Authorization
Všechny chráněné endpointy používají:

```http
Authorization: Bearer <jwt_token>
```

## Standardní error tvar
Aktuálně může být message vracená jako text nebo JSON s message/msg, ale cílově doporučuji sjednotit na:

```json
{
  "ok": false,
  "message": "Popis chyby"
}
```

---

## 2. Health

## GET `/health`
### Response 200
```json
{
  "ok": true,
  "service": "zoom-pro"
}
```

---

## 3. Auth

## POST `/api/auth/register`
### Request body
```json
{
  "email": "uzivatel@firma.cz",
  "password": "tajneheslo",
  "companyName": "Moje VZT Firma",
  "joinId": ""
}
```

### Varianta A — založení nové firmy
Použij `companyName`, `joinId` nech prázdné.

### Varianta B — připojení do existující firmy
Použij `joinId`, `companyName` může být prázdné.

### Response 200 při nové firmě
```json
{
  "msg": "Firma založena! Vyčkejte na licenci."
}
```

### Response 200 při join uživateli
```json
{
  "msg": "Účet vytvořen. Čekejte na schválení ředitelstvím."
}
```

### Možné chyby
- 400 — e-mail už existuje
- 404 — join firma nenalezena

---

## POST `/api/auth/login`
### Request body
```json
{
  "email": "uzivatel@firma.cz",
  "password": "tajneheslo"
}
```

### Response 200
```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "uzivatel@firma.cz",
    "role": "REDITEL",
    "companyId": "uuid",
    "isApproved": true,
    "compActive": true
  }
}
```

### Možné chyby
- 401 — špatné údaje
- 403 — firma nemá licenci

---

## 4. Sync

## GET `/api/sync`
Vrací agregovaný model pro aktuální frontend.

### Response 200
```json
{
  "company": {
    "id": "uuid",
    "name": "Moje firma",
    "isActive": true,
    "costPerSqMeter": 10.5,
    "sellPerSqMeter": 17.8
  },
  "users": [
    {
      "id": "uuid",
      "email": "user@firma.cz",
      "role": "MONTER",
      "isApproved": true,
      "createdAt": "2026-06-25T10:00:00.000Z"
    }
  ],
  "projects": [],
  "assignments": [],
  "chats": [],
  "attendance": [],
  "logs": [],
  "invoices": [],
  "components": [],
  "consumables": {
    "totalScrews": 0,
    "totalTapeMeters": 0
  },
  "allCompanies": []
}
```

### Poznámka
`allCompanies` je plněné pouze pro roli `SUPERADMIN`.

---

## 5. Attendance

## POST `/api/attendance`
### Request body
```json
{
  "projectId": "uuid-nebo-null",
  "type": "PRICHOD",
  "status": "PRACE",
  "lat": 50.087,
  "lng": 14.421
}
```

### Povolené hodnoty
`type`:
- `PRICHOD`
- `ODCHOD`
- `ABSENCE`

`status`:
- `PRACE`
- `NEMOC`
- `DOVOLENA`
- `SKOLENI`
- `CESTA`

### Response 200
```json
{
  "ok": true,
  "attendance": {
    "id": "uuid",
    "companyId": "uuid",
    "userId": "uuid",
    "projectId": "uuid",
    "type": "PRICHOD",
    "status": "PRACE",
    "lat": 50.087,
    "lng": 14.421,
    "createdAt": "2026-06-25T10:00:00.000Z"
  }
}
```

---

## 6. Projects

## POST `/api/projects`
### Request body
```json
{
  "name": "Stavba Praha 01"
}
```

### Response 200
```json
{
  "ok": true,
  "project": {
    "id": "uuid",
    "name": "Stavba Praha 01",
    "companyId": "uuid",
    "createdAt": "2026-06-25T10:00:00.000Z",
    "updatedAt": "2026-06-25T10:00:00.000Z"
  }
}
```

### Role
- `SUPERADMIN`
- `REDITEL`
- `VEDOUCI`

---

## POST `/api/projects/assign`
### Request body
```json
{
  "projectId": "uuid",
  "userId": "uuid",
  "assign": true
}
```

### Response 200 při assign
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "companyId": "uuid",
  "assignedAt": "2026-06-25T10:00:00.000Z"
}
```

### Response 200 při unassign
```json
{
  "ok": true
}
```

---

## POST `/api/projects/chat`
### Request body
```json
{
  "projectId": "uuid",
  "text": "Hotovo, potrubí je osazeno."
}
```

### Response 200
```json
{
  "ok": true,
  "chat": {
    "id": "uuid",
    "projectId": "uuid",
    "userId": "uuid",
    "companyId": "uuid",
    "text": "Hotovo, potrubí je osazeno.",
    "createdAt": "2026-06-25T10:00:00.000Z"
  }
}
```

---

## 7. Daily logs

## POST `/api/logs`
### Request body
```json
{
  "projectId": "uuid",
  "date": "2026-06-25",
  "weather": "Polojasno 22C",
  "content": "Montáž hlavní trasy dokončena."
}
```

### Response 200
```json
{
  "ok": true,
  "log": {
    "id": "uuid",
    "companyId": "uuid",
    "projectId": "uuid",
    "authorId": "uuid",
    "logDate": "2026-06-25",
    "weather": "Polojasno 22C",
    "content": "Montáž hlavní trasy dokončena.",
    "attachments": [],
    "isLocked": false,
    "createdAt": "2026-06-25T10:00:00.000Z",
    "updatedAt": "2026-06-25T10:00:00.000Z"
  }
}
```

---

## 8. VZT calculator

## POST `/api/vzt`
### Request body
```json
{
  "type": "Rovné",
  "width": 500,
  "height": 300,
  "length": 1200,
  "angle": 0
}
```

### Response 200
```json
{
  "ok": true,
  "component": {
    "id": "uuid",
    "type": "Rovné",
    "width": 500,
    "height": 300,
    "length": 1200,
    "surfaceArea": 1.92,
    "weight": 12.5,
    "companyId": "uuid",
    "createdAt": "2026-06-25T10:00:00.000Z"
  }
}
```

### Poznámka
Přesný výpočet vychází ze service/repository logiky VZT modulu. Frontend sem posílá rozměry a typ.

---

## 9. Invoices

## POST `/api/invoices`
### Request body
```json
{
  "invoiceNumber": "2026-001",
  "amount": 2500
}
```

### Response 200
```json
{
  "ok": true,
  "invoice": {
    "id": "uuid",
    "companyId": "uuid",
    "invoiceNumber": "2026-001",
    "amount": 2500,
    "status": "ISSUED",
    "issuedAt": "2026-06-25T10:00:00.000Z",
    "createdAt": "2026-06-25T10:00:00.000Z",
    "updatedAt": "2026-06-25T10:00:00.000Z"
  }
}
```

---

## POST `/api/invoices/pay`
### Request body
```json
{
  "id": "uuid"
}
```

### Response 200
```json
{
  "ok": true,
  "invoice": {
    "id": "uuid",
    "companyId": "uuid",
    "invoiceNumber": "2026-001",
    "amount": 2500,
    "status": "ZAPLACENO",
    "paidAt": "2026-06-25T10:00:00.000Z",
    "updatedAt": "2026-06-25T10:00:00.000Z"
  }
}
```

### Upozornění
Backend skeleton zde používá status `ZAPLACENO`, zatímco databázový enum v návrhu používá i enterprise varianty jako `ISSUED`, `OVERDUE`, `CANCELLED`. Doporučené je později sjednotit invoice status model.

---

## 10. Users / Team

## POST `/api/users/approve`
### Request body
```json
{
  "userId": "uuid"
}
```

### Response 200
```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "pracovnik@firma.cz",
    "role": "MONTER",
    "isApproved": true
  }
}
```

---

## POST `/api/users/role`
### Request body
```json
{
  "userId": "uuid",
  "role": "VEDOUCI"
}
```

### Response 200
```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "pracovnik@firma.cz",
    "role": "VEDOUCI",
    "isApproved": true
  }
}
```

### Povolené role
- `SUPERADMIN`
- `REDITEL`
- `ADMINISTRACE`
- `VEDOUCI`
- `MONTER`

### Kdo může měnit role
- `SUPERADMIN`
- `REDITEL`

---

## 11. SaaS

## POST `/api/saas/toggle`
### Request body
```json
{
  "companyId": "uuid"
}
```

### Response 200
```json
{
  "ok": true,
  "company": {
    "id": "uuid",
    "name": "Moje firma",
    "isActive": false
  }
}
```

### Použití
Zapnutí / vypnutí licence firmy v superadmin přehledu.

---

## 12. Settings

## POST `/api/settings`
Slouží pro uložení ceníku na firmu.

### Request body
```json
{
  "cost": 10.5,
  "sell": 17.8
}
```

### Response 200
```json
{
  "ok": true,
  "company": {
    "id": "uuid",
    "name": "Moje firma",
    "costPerSqMeter": 10.5,
    "sellPerSqMeter": 17.8,
    "updatedAt": "2026-06-25T10:00:00.000Z"
  }
}
```

---

## GET `/api/settings/company`
### Response 200
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "locale": "cs-CZ",
  "timezone": "Europe/Prague",
  "currency": "CZK",
  "enabledModules": ["dochazka", "projekty", "faktury"]
}
```

---

## GET `/api/settings/modules/:moduleKey`
### Response 200
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "moduleKey": "attendance",
  "settingsJson": {
    "requireGps": true,
    "allowManualEdit": false
  },
  "version": 1,
  "updatedBy": "uuid",
  "updatedAt": "2026-06-25T10:00:00.000Z"
}
```

---

## PUT `/api/settings/modules/:moduleKey`
### Request body
```json
{
  "requireGps": true,
  "allowManualEdit": false,
  "allowBackfill": true
}
```

### Response 200
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "moduleKey": "attendance",
  "settingsJson": {
    "requireGps": true,
    "allowManualEdit": false,
    "allowBackfill": true
  },
  "version": 2,
  "updatedBy": "uuid",
  "updatedAt": "2026-06-25T10:00:00.000Z"
}
```

---

## 13. Documents

## GET `/api/documents`
### Query params
Možné filtry podle budoucího rozšíření:
- `status`
- `type`
- `authorId`
- `projectId`

### Response 200
```json
[
  {
    "id": "uuid",
    "companyId": "uuid",
    "type": "INVOICE",
    "status": "DRAFT",
    "title": "Faktura 2026-001",
    "dataJson": {},
    "createdAt": "2026-06-25T10:00:00.000Z"
  }
]
```

---

## GET `/api/documents/:id`
### Response 200
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "type": "INVOICE",
  "status": "DRAFT",
  "title": "Faktura 2026-001",
  "dataJson": {
    "invoiceNumber": "2026-001",
    "amount": 2500
  },
  "createdAt": "2026-06-25T10:00:00.000Z"
}
```

---

## POST `/api/documents`
### Request body
```json
{
  "type": "INVOICE",
  "title": "Faktura 2026-001",
  "dataJson": {
    "invoiceNumber": "2026-001",
    "amount": 2500
  }
}
```

### Response 201
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "authorId": "uuid",
  "type": "INVOICE",
  "title": "Faktura 2026-001",
  "dataJson": {
    "invoiceNumber": "2026-001",
    "amount": 2500
  },
  "hashPreview": "sha256-preview-hash"
}
```

---

## POST `/api/documents/:id/approve`
### Response 200
```json
{
  "id": "uuid",
  "status": "APPROVED",
  "approvedBy": "uuid",
  "updatedAt": "2026-06-25T10:00:00.000Z"
}
```

---

## 14. Imports

## GET `/api/imports/profiles`
### Response 200
```json
[
  {
    "id": "uuid",
    "companyId": "uuid",
    "moduleKey": "inventory",
    "name": "Import skladu CSV",
    "mappingJson": {}
  }
]
```

---

## GET `/api/imports/jobs`
### Response 200
```json
[
  {
    "id": "uuid",
    "companyId": "uuid",
    "moduleKey": "inventory",
    "status": "PENDING",
    "createdAt": "2026-06-25T10:00:00.000Z"
  }
]
```

---

## POST `/api/imports/jobs`
### Request body
```json
{
  "profileId": "uuid",
  "moduleKey": "inventory",
  "sourceFileName": "sklad.csv",
  "optionsJson": {
    "delimiter": ";",
    "encoding": "utf-8",
    "dryRun": true
  }
}
```

### Response 201
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "createdBy": "uuid",
  "moduleKey": "inventory",
  "status": "PENDING",
  "sourceFileName": "sklad.csv",
  "optionsJson": {
    "delimiter": ";",
    "encoding": "utf-8",
    "dryRun": true
  }
}
```

---

## 15. Exports

## GET `/api/exports/profiles`
### Response 200
```json
[
  {
    "id": "uuid",
    "companyId": "uuid",
    "moduleKey": "invoices",
    "name": "PDF faktury",
    "format": "PDF"
  }
]
```

---

## GET `/api/exports/jobs`
### Response 200
```json
[
  {
    "id": "uuid",
    "companyId": "uuid",
    "moduleKey": "invoices",
    "status": "PENDING",
    "createdAt": "2026-06-25T10:00:00.000Z"
  }
]
```

---

## POST `/api/exports/jobs`
### Request body
```json
{
  "profileId": "uuid",
  "moduleKey": "invoices",
  "format": "PDF",
  "filtersJson": {
    "status": "ISSUED"
  }
}
```

### Response 201
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "createdBy": "uuid",
  "moduleKey": "invoices",
  "status": "PENDING",
  "format": "PDF",
  "filtersJson": {
    "status": "ISSUED"
  }
}
```

---

## 16. Signatures

## GET `/api/signatures/providers`
### Response 200
```json
[
  {
    "id": "uuid",
    "companyId": "uuid",
    "providerKey": "internal",
    "displayName": "Interní schválení",
    "isActive": true
  }
]
```

---

## POST `/api/signatures/requests`
### Request body
```json
{
  "documentId": "uuid",
  "providerId": "uuid",
  "signerName": "Jan Novak",
  "signerEmail": "jan@firma.cz",
  "level": "INTERNAL_APPROVAL"
}
```

### Response 201
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "documentId": "uuid",
  "providerId": "uuid",
  "signerName": "Jan Novak",
  "signerEmail": "jan@firma.cz",
  "level": "INTERNAL_APPROVAL",
  "status": "PENDING"
}
```

---

## 17. Doporučený cílový standard response envelope

Doporučené je později sjednotit celý backend na tento obal:

### Success single
```json
{
  "ok": true,
  "data": {}
}
```

### Success list
```json
{
  "ok": true,
  "data": [],
  "meta": {
    "count": 10
  }
}
```

### Error
```json
{
  "ok": false,
  "message": "Chybová hláška",
  "code": "VALIDATION_ERROR"
}
```

---

## 18. Doporučené další kroky pro API vrstvu

1. doplnit Zod/Ajv validace pro každý endpoint
2. dopsat capability middleware nad role guard
3. vytvořit OpenAPI 3.1 yaml/json specifikaci
4. přidat `/api/documents/export` a `/api/documents/sign`
5. přidat file upload endpointy pro imports/documents attachments
6. přidat webhook endpoint pro externí podpisové providery
7. přidat background job queue pro import/export/signature processing
