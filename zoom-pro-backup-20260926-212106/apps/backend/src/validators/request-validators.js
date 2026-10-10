const ROLES = ['SUPERADMIN', 'REDITEL', 'ADMINISTRACE', 'VEDOUCI', 'MONTER'];
const ATTENDANCE_TYPES = ['PRICHOD', 'ODCHOD', 'ABSENCE'];
const ATTENDANCE_STATUSES = ['PRACE', 'NEMOC', 'DOVOLENA', 'SKOLENI', 'CESTA'];
const DOCUMENT_TYPES = ['INVOICE', 'PROFORMA_INVOICE', 'CREDIT_NOTE', 'ATTENDANCE_STATEMENT', 'ATTENDANCE_CLOSURE', 'DAILY_LOG_ENTRY', 'DAILY_LOG_REPORT', 'PROJECT_ASSIGNMENT', 'PROJECT_HANDOVER_PROTOCOL', 'CHANGE_PROTOCOL', 'INVENTORY_ISSUE_NOTE', 'INVENTORY_RECEIPT_NOTE', 'INVENTORY_AUDIT_PROTOCOL', 'VZT_CALCULATION_SHEET', 'VZT_PRODUCTION_SHEET', 'PRICE_OFFER', 'SERVICE_REPORT', 'LICENSE_AGREEMENT', 'USER_APPROVAL', 'SIGNATURE_AUTHORIZATION', 'PAYMENT_REMINDER', 'PAYMENT_CONFIRMATION'];
const DOCUMENT_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PENDING_SIGNATURE', 'SIGNED', 'EXPORTED', 'ARCHIVED', 'REJECTED', 'CANCELLED', 'SUPERSEDED'];
const EXPORT_FORMATS = ['PDF', 'DOCX', 'XLSX'];
const SIGNATURE_LEVELS = ['INTERNAL_APPROVAL', 'SIMPLE', 'ADVANCED', 'QUALIFIED', 'ELECTRONIC_SEAL', 'TIMESTAMP_ONLY'];
const PROJECT_GPS_MODES = ['MANUAL', 'AUTO', 'COMBINED'];
const INVENTORY_MOVEMENT_TYPES = ['RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'WRITE_OFF', 'RETURN'];
const TROUBLESHOOTING_CATEGORIES = ['COLLISION', 'MATERIAL', 'NOISE_HAPTIC', 'LEAK', 'ASSEMBLY', 'ELECTRICAL', 'AIR_FLOW', 'OTHER'];
const TROUBLESHOOTING_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'];
const COLLISION_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED'];
const PRINT_DOCUMENT_TYPES = ['issue', 'receipt', 'inventory-audit'];

function requiredString(value, field, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min) return `${field} je povinný text`;
  return null;
}

function optionalEnum(value, field, allowed) {
  if (value === undefined || value === null || value === '') return null;
  if (!allowed.includes(value)) return `${field} musí být jedna z hodnot: ${allowed.join(', ')}`;
  return null;
}

function requiredEnum(value, field, allowed) {
  if (!allowed.includes(value)) return `${field} musí být jedna z hodnot: ${allowed.join(', ')}`;
  return null;
}

function optionalNumber(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (Number.isNaN(Number(value))) return `${field} musí být číslo`;
  return null;
}

function requiredNumber(value, field) {
  if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) return `${field} musí být číslo`;
  return null;
}

function optionalEmail(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !value.includes('@')) return `${field} musí být validní e-mail`;
  return null;
}

function requiredBooleanLike(value, field) {
  if (typeof value !== 'boolean') return `${field} musí být boolean`;
  return null;
}

function requiredUuidish(value, field) {
  if (typeof value !== 'string' || value.trim().length < 8) return `${field} musí být neprázdné ID`;
  return null;
}

function optionalStringArray(value, field, { maxItems = 4 } = {}) {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return `${field} musí být pole`;
  if (value.length > maxItems) return `${field} může mít maximálně ${maxItems} položky`;
  if (value.some((item) => typeof item !== 'string' || !item.trim())) return `${field} musí obsahovat jen textové položky`;
  return null;
}

function collect(checks) {
  return checks.filter(Boolean);
}

export const validators = {
  authRegister(body) {
    return collect([
      requiredString(body.email, 'email', 3),
      requiredString(body.password, 'password', 6),
      !body.joinId ? requiredString(body.companyName, 'companyName', 2) : null,
      body.joinId ? requiredUuidish(body.joinId, 'joinId') : null
    ]);
  },
  authLogin(body) {
    return collect([
      requiredString(body.email, 'email', 3),
      requiredString(body.password, 'password', 6)
    ]);
  },
  attendanceCreate(body) {
    return collect([
      requiredEnum(body.type, 'type', ATTENDANCE_TYPES),
      requiredEnum(body.status || 'PRACE', 'status', ATTENDANCE_STATUSES),
      body.projectId ? requiredUuidish(body.projectId, 'projectId') : null,
      optionalNumber(body.lat, 'lat'),
      optionalNumber(body.lng, 'lng')
    ]);
  },
  projectCreate(body) {
    return collect([
      requiredString(body.name, 'name', 2),
      optionalNumber(body.lat, 'lat'),
      optionalNumber(body.lng, 'lng'),
      optionalNumber(body.radius, 'radius') || (body.radius !== undefined && Number(body.radius) < 0 ? 'radius nesmí být záporné' : null),
      optionalNumber(body.budget, 'budget'),
      optionalEnum(body.gpsMode, 'gpsMode', PROJECT_GPS_MODES)
    ]);
  },
  projectUpdate(body) {
    return collect([
      requiredUuidish(body.projectId, 'projectId'),
      ...validators.projectCreate(body)
    ]);
  },
  projectAssign(body) {
    return collect([
      requiredUuidish(body.projectId, 'projectId'),
      requiredUuidish(body.userId, 'userId'),
      requiredBooleanLike(body.assign, 'assign')
    ]);
  },
  projectChat(body) {
    return collect([
      requiredUuidish(body.projectId, 'projectId'),
      body.text || (Array.isArray(body.attachments) && body.attachments.length) ? null : 'text nebo attachments je povinné',
      body.text ? requiredString(body.text, 'text', 1) : null,
      optionalStringArray(body.attachments, 'attachments')
    ]);
  },
  logCreate(body) {
    return collect([
      requiredUuidish(body.projectId, 'projectId'),
      requiredString(body.date, 'date', 4),
      requiredString(body.weather, 'weather', 2),
      requiredString(body.content, 'content', 2),
      optionalStringArray(body.attachments, 'attachments')
    ]);
  },
  invoiceCreate(body) {
    return collect([
      body.invoiceNumber ? requiredString(body.invoiceNumber, 'invoiceNumber', 1) : null,
      requiredNumber(body.amount, 'amount') || (Number(body.amount) <= 0 ? 'amount musí být větší než 0' : null),
      body.projectId ? requiredUuidish(body.projectId, 'projectId') : null,
      body.employeeId ? requiredUuidish(body.employeeId, 'employeeId') : null,
      optionalNumber(body.vatRate, 'vatRate')
    ]);
  },
  invoiceAutoCreate(body) {
    return collect([
      body.employeeId ? requiredUuidish(body.employeeId, 'employeeId') : null,
      requiredString(body.periodFrom, 'periodFrom', 8),
      requiredString(body.periodTo, 'periodTo', 8),
      requiredNumber(body.hourlyRate, 'hourlyRate') || (Number(body.hourlyRate) < 0 ? 'hourlyRate nesmí být záporné' : null),
      optionalNumber(body.logRate, 'logRate') || (body.logRate !== undefined && Number(body.logRate) < 0 ? 'logRate nesmí být záporné' : null),
      optionalNumber(body.bonusAmount, 'bonusAmount'),
      body.projectId ? requiredUuidish(body.projectId, 'projectId') : null
    ]);
  },
  invoicePay(body) {
    return collect([requiredUuidish(body.id, 'id')]);
  },
  userApprove(body) {
    return collect([requiredUuidish(body.userId, 'userId')]);
  },
  userRole(body) {
    return collect([
      requiredUuidish(body.userId, 'userId'),
      requiredEnum(body.role, 'role', ROLES)
    ]);
  },
  settingsPricing(body) {
    return collect([
      optionalNumber(body.cost, 'cost') || (Number(body.cost) < 0 ? 'cost nesmí být záporné' : null),
      optionalNumber(body.sell, 'sell') || (Number(body.sell) < 0 ? 'sell nesmí být záporné' : null)
    ]);
  },
  moduleSettingsBody(body) {
    return collect([
      typeof body === 'object' && body !== null && !Array.isArray(body) ? null : 'body musí být JSON objekt'
    ]);
  },
  moduleKeyParam(params) {
    return collect([requiredString(params.moduleKey, 'moduleKey', 2)]);
  },
  documentsQuery(query) {
    return collect([
      optionalEnum(query.status, 'status', DOCUMENT_STATUSES),
      optionalEnum(query.documentType, 'documentType', DOCUMENT_TYPES)
    ]);
  },
  documentIdParam(params) {
    return collect([requiredUuidish(params.id, 'id')]);
  },
  documentCreate(body) {
    return collect([
      requiredEnum(body.documentType, 'documentType', DOCUMENT_TYPES),
      requiredString(body.title, 'title', 2),
      body.dataJson && typeof body.dataJson === 'object' && !Array.isArray(body.dataJson) ? null : 'dataJson musí být objekt'
    ]);
  },
  importJobCreate(body) {
    return collect([
      requiredString(body.moduleKey, 'moduleKey', 2),
      requiredString(body.sourceFileName, 'sourceFileName', 2),
      requiredString(body.sourceFileUrl, 'sourceFileUrl', 8)
    ]);
  },
  exportJobCreate(body) {
    return collect([
      requiredString(body.moduleKey, 'moduleKey', 2),
      requiredEnum(body.format, 'format', EXPORT_FORMATS),
      body.filters === undefined || (typeof body.filters === 'object' && body.filters !== null && !Array.isArray(body.filters)) ? null : 'filters musí být objekt'
    ]);
  },
  signatureRequestCreate(body) {
    return collect([
      requiredUuidish(body.providerId, 'providerId'),
      requiredString(body.signerName, 'signerName', 2),
      requiredEnum(body.signatureLevel, 'signatureLevel', SIGNATURE_LEVELS),
      body.documentId ? requiredUuidish(body.documentId, 'documentId') : null,
      body.signerId ? requiredUuidish(body.signerId, 'signerId') : null,
      optionalEmail(body.signerEmail, 'signerEmail')
    ]);
  },
  signatureMobileCreate(body) {
    return collect([
      requiredString(body.signerName, 'signerName', 2),
      requiredString(body.documentType, 'documentType', 2),
      requiredString(body.signatureDataUrl, 'signatureDataUrl', 16),
      body.projectId ? requiredUuidish(body.projectId, 'projectId') : null
    ]);
  },
  vztCreate(body) {
    return collect([
      requiredString(body.type, 'type', 2),
      optionalNumber(body.width, 'width'),
      optionalNumber(body.height, 'height'),
      optionalNumber(body.width2, 'width2'),
      optionalNumber(body.height2, 'height2'),
      optionalNumber(body.length, 'length') || (Number(body.length) <= 0 ? 'length musí být větší než 0' : null),
      optionalNumber(body.angle, 'angle'),
      optionalNumber(body.offset, 'offset')
    ]);
  },
  inventoryItemCreate(body) {
    return collect([
      requiredString(body.name, 'name', 2),
      body.code ? requiredString(body.code, 'code', 1) : null,
      requiredNumber(body.quantity, 'quantity'),
      requiredString(body.unit, 'unit', 1),
      optionalNumber(body.minQuantity, 'minQuantity'),
      optionalNumber(body.purchasePrice, 'purchasePrice'),
      optionalNumber(body.sellPrice, 'sellPrice')
    ]);
  },
  inventoryMovementCreate(body) {
    return collect([
      requiredUuidish(body.itemId, 'itemId'),
      requiredEnum(body.type, 'type', INVENTORY_MOVEMENT_TYPES),
      requiredNumber(body.quantity, 'quantity') || (Number(body.quantity) === 0 ? 'quantity nesmí být 0' : null),
      body.projectId ? requiredUuidish(body.projectId, 'projectId') : null
    ]);
  },
  assistantAnalyze(body) {
    return collect([
      requiredString(body.prompt, 'prompt', 2),
      body.projectId ? requiredUuidish(body.projectId, 'projectId') : null,
      body.itemCode ? requiredString(body.itemCode, 'itemCode', 1) : null
    ]);
  },
  projectIdParam(params) {
    return collect([requiredUuidish(params.projectId, 'projectId')]);
  },
  troubleshootingCreate(body) {
    return collect([
      requiredUuidish(body.projectId, 'projectId'),
      requiredString(body.title, 'title', 3),
      requiredString(body.description, 'description', 5),
      body.category ? requiredEnum(body.category, 'category', TROUBLESHOOTING_CATEGORIES) : null,
      body.severity ? requiredEnum(body.severity, 'severity', TROUBLESHOOTING_SEVERITIES) : null,
      body.imageUrl && !String(body.imageUrl).startsWith('data:image/') && !/^https?:\/\//.test(String(body.imageUrl)) ? 'imageUrl musí být data URI obrázku nebo http(s) URL' : null
    ]);
  },
  troubleshootingAnalyze(body) {
    return collect([
      requiredString(body.text, 'text', 3)
    ]);
  },
  collisionStatus(body) {
    return collect([
      requiredUuidish(body.collisionId, 'collisionId'),
      requiredEnum(body.status, 'status', COLLISION_STATUSES)
    ]);
  },
  printDocumentParams(params) {
    return collect([requiredEnum(params.documentType, 'documentType', PRINT_DOCUMENT_TYPES)]);
  },
  printDocumentBody(body) {
    return collect([
      body.itemId ? requiredUuidish(body.itemId, 'itemId') : null,
      body.documentRef ? requiredString(body.documentRef, 'documentRef', 1) : null
    ]);
  },
  printQrZone(body) {
    return collect([requiredUuidish(body.projectId, 'projectId')]);
  },
  printQrInventory(body) {
    return collect([
      Array.isArray(body.codes) && body.codes.some((code) => typeof code !== 'string' || !code.trim()) ? 'codes musí být pole textových kódů' : null
    ]);
  },
  companyIdBody(body) {
    return collect([requiredUuidish(body.companyId, 'companyId')]);
  },
  userPasswordChange(body) {
    return collect([
      requiredString(body.currentPassword, 'currentPassword', 1),
      requiredString(body.newPassword, 'newPassword', 8)
    ]);
  },
  userProfileUpdate(body) {
    return collect([
      body.firstName !== undefined && typeof body.firstName !== 'string' ? 'firstName musí být text' : null,
      body.lastName !== undefined && typeof body.lastName !== 'string' ? 'lastName musí být text' : null,
      (body.firstName !== undefined && String(body.firstName).trim().length > 80) ? 'firstName je moc dlouhé' : null,
      (body.lastName !== undefined && String(body.lastName).trim().length > 80) ? 'lastName je moc dlouhé' : null
    ]);
  }
};
