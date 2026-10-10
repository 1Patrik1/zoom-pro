export type Role = 'SUPERADMIN' | 'REDITEL' | 'ADMINISTRACE' | 'VEDOUCI' | 'MONTER';
export type UserRole = Role;

export type AttendanceType = 'PRICHOD' | 'ODCHOD' | 'ABSENCE';
export type AttendanceStatus = 'PRACE' | 'NEMOC' | 'DOVOLENA' | 'SKOLENI' | 'CESTA';
export type GeoStatus = 'OK' | 'OUT_OF_RADIUS' | 'NO_PROJECT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isApproved: boolean;
  companyId: string;
  phone?: string;
  employeeId?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
  hourlyRate?: number;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  ico?: string;
  dic?: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  web?: string;
  bankAccount?: string;
  bankIban?: string;
  bankSwift?: string;
  bankName?: string;
  costPerSqMeter: number;
  sellPerSqMeter: number;
  logoUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  code?: string;
  clientName?: string;
  address?: string;
  lat?: number;
  lng?: number;
  radius: number; // meters
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  plannedStart?: string;
  plannedEnd?: string;
  budget?: number;
  gpsMode?: 'MANUAL' | 'GPS_AUTO';
  locationNote?: string;
  companyId: string;
  currency?: string;
  createdAt: string;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  authorName: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ProjectPhoto {
  id: string;
  projectId: string;
  caption: string;
  url: string;
  category: string;
  createdAt: string;
}

export interface ProjectGalleryItem {
  id: string;
  projectId: string;
  userId: string;
  userName?: string;
  imageUrl: string;
  caption?: string;
  sourceChatId?: string;
  createdAt: string;
}

export interface ProjectChat {
  id: string;
  projectId: string;
  userId: string;
  userName?: string;
  userRole?: Role;
  text: string;
  attachmentUrl?: string;
  attachmentType?: 'IMAGE' | 'DOCUMENT' | 'AUDIO';
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName?: string;
  companyId: string;
  projectId?: string;
  projectName?: string;
  type: AttendanceType;
  status: AttendanceStatus;
  lat?: number;
  lng?: number;
  distanceFromProjectM?: number;
  withinProjectRadius?: boolean;
  geoStatus: GeoStatus;
  projectRadiusSnapshot?: number;
  projectAddressSnapshot?: string;
  note?: string;
  createdAt: string;
}

export interface DailyLog {
  id: string;
  companyId: string;
  projectId?: string;
  projectName?: string;
  authorId: string;
  authorName: string;
  logDate: string;
  weather?: string;
  workerCount?: number;
  content: string;
  attachments?: string[];
  isLocked: boolean;
  signedBy?: string;
  signedAt?: string;
  signatureHash?: string;
  createdAt: string;
}

export type MediumType = 'VZT' | 'VODA' | 'TOPENI';

export type VztProfileShape = 'HRANATE' | 'KULATE' | 'PRECHOD';

export type VztComponentType =
  | 'Rovné'
  | 'Kruhové'
  | 'Koleno'
  | 'Redukce'
  | 'Odsazení'
  | 'T-Kus'
  | 'Odbočka'
  | 'Klapka'
  | 'Tlumic_Hluku'
  | 'Zaslepka'
  | 'Trubka_Voda'
  | 'Trubka_Topeni'
  | 'Armatura_Ventil';

export interface VztComponent {
  id: string;
  companyId: string;
  projectId?: string;
  projectName?: string;
  medium?: MediumType;
  shape?: VztProfileShape; // HRANATE (4HR) vs KULATE (Spiro) vs PRECHOD
  type: VztComponentType;
  width?: number; // mm (Šířka A)
  height?: number; // mm (Výška B)
  diameter?: number; // mm for circular / pipe DN / Spiro ØD
  diameter2?: number; // mm for circular reducer ØD2
  dn?: number; // Nominal diameter for water/heating
  width2?: number; // for rectangular transition A2
  height2?: number; // for rectangular transition B2
  branchWidth?: number; // mm for rectangular branch
  branchHeight?: number; // mm for rectangular branch
  branchDiameter?: number; // mm for circular branch
  length: number; // mm (Délka L)
  angle?: number; // for elbow: 90, 60, 45, 30, 15
  radius?: number; // mm (Poloměr ohybu R kolena)
  offset?: number; // mm (změna osy / etážka)
  flangeType?: 'P20' | 'P30' | 'P40' | 'SPIRO_SPOJKA' | 'PRIRUBA_KRUHOVA' | 'BEZ_PRIRUBY';
  innerRadius?: number; // mm (vnitřní doměr)
  centerRadius?: number; // mm (střední doměr)
  outerRadius?: number; // mm (vnější doměr)
  developedLength?: number; // mm (rozvinutá délka)
  surfaceArea: number; // m²
  weight: number; // kg
  waterWeight?: number; // kg (hmotnost vodního obsahu)
  material: 'POZINK' | 'NEREZ' | 'HLINIK' | 'MED' | 'PPR' | 'PEX_AL_PEX' | 'OCEL_UHLIKOVA' | 'OCEL_BEZESVA';
  sheetThickness: number; // mm
  requiresAccessDoor: boolean;
  flowRate?: number; // m3/h or l/s
  heatPowerKw?: number; // kW for heating
  tempDeltaK?: number; // Delta T in K
  velocity?: number; // m/s
  pressureLossPa?: number; // Pa / kPa
  costPrice: number;
  sellPrice: number;
  note?: string;
  createdAt: string;
}

export interface ConsumablesSummary {
  totalScrews: number; // ks (M8)
  totalTapeMeters: number; // m
  totalRivets: number; // ks
  totalSealant: number; // ml
  totalArea: number; // m2
  totalWeight: number; // kg
}

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'VYSTAVENO' | 'ZAPLACENO' | 'OVERDUE' | 'PO_SPLATNOSTI' | 'CANCELLED' | 'STORNO';

export interface Invoice {
  id: string;
  companyId: string;
  number: string;
  invoiceNumber?: string;
  clientName: string;
  clientIco?: string;
  clientDic?: string;
  clientAddress?: string;
  amount: number;
  amountVat?: number;
  amountTotal: number;
  currency: string;
  vatRate?: number;
  status: InvoiceStatus;
  dueDate: string;
  issueDate?: string;
  issuedAt: string;
  paidAt?: string;
  projectId?: string;
  projectName?: string;
  employeeId?: string;
  employeeName?: string;
  autoGenerated?: boolean;
  sourceType?: 'MANUAL' | 'ATTENDANCE_WORK' | 'LOG_ENTRIES';
  periodFrom?: string;
  periodTo?: string;
  workHours?: number;
  attendanceDays?: number;
  unitRate?: number;
  logEntries?: number;
  logRate?: number;
  bonusAmount?: number;
  variableSymbol?: string;
  constantSymbol?: string;
  note?: string;
  qrPaymentData?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  companyId: string;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  location?: string;
  purchasePrice?: number;
  unitCost?: number;
  sellPrice?: number;
  category: string;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  companyId: string;
  itemId: string;
  itemName?: string;
  type: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'WRITE_OFF';
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  projectId?: string;
  projectName?: string;
  note?: string;
  documentRef?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export type DocumentType =
  | 'PREDAVACI_PROTOKOL'
  | 'VYKAZ_PRACI'
  | 'ZKOUSEK_TESNOSTI'
  | 'REVIZNI_ZPRAVA'
  | 'INVOICE'
  | 'PROFORMA_INVOICE'
  | 'ATTENDANCE_STATEMENT'
  | 'DAILY_LOG_REPORT'
  | 'PROJECT_HANDOVER_PROTOCOL'
  | 'VZT_CALCULATION_SHEET'
  | 'PRICE_OFFER'
  | 'SERVICE_REPORT';

export type DocumentStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SCHVALENO'
  | 'PENDING_SIGNATURE'
  | 'SIGNED'
  | 'EXPORTED'
  | 'ARCHIVED';

export interface Document {
  id: string;
  companyId: string;
  documentType?: DocumentType;
  type?: DocumentType;
  documentNumber?: string;
  status: DocumentStatus;
  title: string;
  projectId?: string;
  projectName?: string;
  authorId?: string;
  authorName?: string;
  approverId?: string;
  approverName?: string;
  locale?: string;
  dataJson?: Record<string, any>;
  content?: string;
  note?: string;
  hashBefore?: string;
  hashAfter?: string;
  createdAt: string;
  updatedAt?: string;
}

export type DocumentItem = Document;

export interface ImportProfile {
  id: string;
  name: string;
  moduleKey?: string;
  targetModule?: string;
  format: 'CSV' | 'XLSX' | 'JSON' | 'XML';
  delimiter?: string;
  duplicateStrategy?: string;
  isActive?: boolean;
  mapping?: Record<string, string>;
}

export interface ImportJob {
  id: string;
  companyId: string;
  moduleKey: string;
  status: 'COMPLETED' | 'RUNNING' | 'PENDING' | 'FAILED';
  sourceFileName: string;
  totalRows: number;
  successRows: number;
  warningRows: number;
  errorRows: number;
  isDryRun: boolean;
  startedByName: string;
  startedAt: string;
}

export interface ExportProfile {
  id: string;
  name: string;
  moduleKey: string;
  format: 'PDF' | 'DOCX' | 'XLSX' | 'ISDOC' | 'CSV';
  signed: boolean;
  watermark: boolean;
  isActive: boolean;
}

export interface ExportJob {
  id: string;
  companyId?: string;
  name?: string;
  moduleKey?: string;
  targetModule?: string;
  status: 'COMPLETED' | 'RUNNING' | 'PENDING';
  format: string;
  outputFileName?: string;
  recordCount?: number;
  outputSizeBytes?: number;
  startedByName?: string;
  startedAt?: string;
  createdAt: string;
}

export interface SignatureProvider {
  id: string;
  name: string;
  providerKey: string;
  supportedLevels: string[];
  isActive: boolean;
  isDefault: boolean;
}

export interface SignatureRequest {
  id: string;
  companyId: string;
  documentTitle: string;
  signerName: string;
  signerRole?: string;
  signerEmail?: string;
  signatureLevel?: string;
  status: 'PENDING' | 'SIGNED' | 'REJECTED';
  providerName: string;
  signedAt?: string;
  signedHash?: string;
  signatureImage?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// ZOOM PRO EXTENDED ENTERPRISE & PLATFORM OWNER MODULES
// -------------------------------------------------------------

// SaaS Licensing & Platform Management
export type LicenseTier = 'START' | 'STANDARD' | 'PRO' | 'ENTERPRISE';

export interface PlatformTenant {
  id: string;
  name: string;
  ico: string;
  ownerEmail: string;
  tier: LicenseTier;
  maxUsers: number;
  storageLimitGb: number;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED';
  validUntil: string;
  createdAt: string;
  activeModules: string[];
}

// Distribution & B2B Purchasing
export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  category: 'SPIRO' | 'CTYRHATNE' | 'TLUMICE' | 'KLAPKY' | 'VENTILY' | 'SPOJOVACI' | 'CHEMIE' | 'IZOLACE';
  manufacturer: string;
  dimensions?: string;
  unit: string;
  standardPrice: number;
  wholesalePrice: number;
  inStock: number;
  leadTimeDays: number;
  imageUrl?: string;
}

export interface Supplier {
  id: string;
  name: string;
  ico: string;
  dic?: string;
  contactPerson: string;
  email: string;
  phone: string;
  rating: number; // 1-5
  discountPercent: number;
  paymentTermsDays: number;
}

export interface PurchaseRequest {
  id: string;
  rfqNumber: string;
  projectId: string;
  projectName: string;
  status: 'DRAFT' | 'SENT_TO_SUPPLIERS' | 'OFFERS_RECEIVED' | 'ORDERED' | 'CANCELLED';
  itemsCount: number;
  estimatedTotal: number;
  requiredDate: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  projectId: string;
  projectName: string;
  totalAmount: number;
  status: 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'INVOICED';
  expectedDelivery: string;
  createdAt: string;
}

export interface CollisionCoordinates3D {
  x: number; // pozice X v metrech (např. 14.5)
  y: number; // pozice Y v metrech (např. 8.2)
  z: number; // výška Z v metrech od podlahy (např. 3.2)
  floor?: string; // např. "2.NP"
  gridAxis?: string; // např. "Osa B-4"
}

// Collisions & QR Labels
export interface SiteCollision {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  location: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  conflictingTrade: 'ZTI' | 'ELEKTRO' | 'STATIKA' | 'CHLAZENI' | 'ARCHITEKTURA';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED_COMPROMISE';
  reportedByName: string;
  photoUrl?: string;
  description: string;
  resolutionNote?: string;
  gpsCoordinates?: string;
  coordinates3d?: CollisionCoordinates3D;
  sentChannels?: ('SYSTEM' | 'EMAIL' | 'WHATSAPP')[];
  assignedTo?: string;
  collisionTag?: string;
  aiAnalysis?: {
    detectedObjects: string[];
    collisionTag: string;
    suggestedTitle: string;
    conflictingTrade: 'ZTI' | 'ELEKTRO' | 'STATIKA' | 'CHLAZENI' | 'ARCHITEKTURA';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    resolutionNote: string;
    complianceNotes?: string;
    confidenceScore?: number;
    analyzedAt: string;
  };
  createdAt: string;
}

export interface QrLabelSpec {
  id: string;
  componentType: string;
  tag: string;
  projectCode: string;
  dimensions: string;
  positionNumber: string;
  floor: string;
  systemBranch: string;
  qrPayload: string;
  isPrinted: boolean;
  installationStatus?: 'MANUFACTURED' | 'SHIPPED_TO_SITE' | 'INSTALLED' | 'INSPECTED' | 'COLLISION_REPORTED';
  installedAt?: string;
  installationPhotoUrl?: string;
  installedByName?: string;
}

// Monter Invoices & Labour Logs
export interface MonterInvoiceClaim {
  id: string;
  monterId: string;
  monterName: string;
  projectId: string;
  projectName: string;
  period: string;
  hoursWorked: number;
  surfaceM2Mounted: number;
  linearMetersMounted: number;
  hourlyClaimAmount: number;
  pieceRateClaimAmount: number;
  totalAmount: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'INVOICE_ISSUED' | 'PAID';
  approvedByName?: string;
  createdAt: string;
}

// Granular Master Settings Schema
export interface CompanySettings {
  companyName?: string;
  ico?: string;
  dic?: string;
  bankAccount?: string;
  bankIban?: string;
  bankSwift?: string;
  bankName?: string;
  street?: string;
  city?: string;
  zip?: string;
  email?: string;
  phone?: string;
  web?: string;
  locale?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  timeFormat?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  firstDayOfWeek?: number;
  distanceUnit?: string;
  areaUnit?: string;
  weightUnit?: string;
  
  // Security Policies
  jwtExpiresInMinutes?: number;
  refreshTokensEnabled?: boolean;
  maxLoginAttempts?: number;
  lockoutDurationMinutes?: number;
  twoFactorRequired?: boolean;
  passwordMinLength?: number;
  requireUppercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  allowedIpRanges?: string[];
  auditSensitiveActions?: boolean;
  require2faForSignatures?: boolean;

  // Attendance & GPS Geofence
  requireGps?: boolean;
  geofenceRadiusMeters?: number;
  allowManualEdit?: boolean;
  allowBackfill?: boolean;
  maxBackfillDays?: number;
  autoBreakEnabled?: boolean;
  autoBreakMinutes?: number;
  roundingMinutes?: number;
  payrollExportEnabled?: boolean;

  // Numbering Patterns
  invoicePrefix?: string;
  invoicePadding?: number;
  dailyLogPrefix?: string;
  attendanceExportPrefix?: string;
  handoverPrefix?: string;
  quotePrefix?: string;

  // VZT Calculation Engine
  sheetMetalDensity?: number; // default 7.85
  weightCoefficient?: number; // default 0.9
  surfaceAreaReserveFactor?: number; // default 1.15
  accessDoorStraightThresholdM?: number; // default 4m
  accessDoorElbowThresholdDeg?: number; // default 45deg
  costPerSqMeter: number;
  sellPerSqMeter: number;
  marginPercent?: number;
  defaultVatRate?: number;

  // Modules Enabled Map
  modulesEnabled: {
    vztConfigurator: boolean;
    gpsAttendance: boolean;
    dailyLog: boolean;
    invoicing: boolean;
    warehouse: boolean;
    signatures: boolean;
    distribution: boolean;
    collisions: boolean;
    monterInvoices: boolean;
    aiAutoDetect: boolean;
    saasLicensing: boolean;
    reports: boolean;
  };
}
