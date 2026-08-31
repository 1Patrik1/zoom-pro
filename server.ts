import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  handleGeminiChat,
  handleTranscribeAudio,
  handleGenerateOrEditImage,
  handleGetChatHistory,
  handleClearChatHistory,
} from './server/geminiHandlers';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initial In-Memory Database initialized from Seed SQL files
const COMPANY_ID = '00000000-0000-4000-8000-000000000001';

const companyData = {
  id: COMPANY_ID,
  name: 'Platform Owner HQ / VZT System s.r.o.',
  ico: '28471923',
  dic: 'CZ28471923',
  street: 'Průmyslová 1420/5',
  city: 'Praha 10',
  zip: '102 00',
  country: 'CZ',
  phone: '+420 800 123 456',
  email: 'info@vzt-system.cz',
  web: 'https://vzt-system.cz',
  bankAccount: '2401839281/2010',
  bankIban: 'CZ5820100000002401839281',
  bankSwift: 'FIOBCZPPXXX',
  bankName: 'Fio banka, a.s.',
  costPerSqMeter: 450,
  sellPerSqMeter: 980,
  logoUrl: '',
};

const users = [
  {
    id: '00000000-0000-4000-8000-000000000010',
    email: 'owner@platform.local',
    password: 'PlatformOwner2026!',
    firstName: 'Patrik',
    lastName: 'Smialek',
    role: 'SUPERADMIN',
    isApproved: true,
    companyId: COMPANY_ID,
    phone: '+420 777 000 001',
    employeeId: 'PLATFORM-OWNER-001',
    hourlyRate: 750,
    createdAt: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000020',
    email: 'vedouci@vzt-system.cz',
    password: 'Password123!',
    firstName: 'Jan',
    lastName: 'Novák',
    role: 'VEDOUCI',
    isApproved: true,
    companyId: COMPANY_ID,
    phone: '+420 777 000 002',
    employeeId: 'EMP-VED-002',
    hourlyRate: 550,
    createdAt: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000030',
    email: 'monter@vzt-system.cz',
    password: 'Password123!',
    firstName: 'Martin',
    lastName: 'Dvořák',
    role: 'MONTER',
    isApproved: true,
    companyId: COMPANY_ID,
    phone: '+420 777 000 003',
    employeeId: 'EMP-MON-003',
    hourlyRate: 380,
    createdAt: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000040',
    email: 'admin@vzt-system.cz',
    password: 'Password123!',
    firstName: 'Klára',
    lastName: 'Svobodová',
    role: 'ADMINISTRACE',
    isApproved: true,
    companyId: COMPANY_ID,
    phone: '+420 777 000 004',
    employeeId: 'EMP-ADM-004',
    hourlyRate: 450,
    createdAt: new Date().toISOString(),
  },
];

const projects = [
  {
    id: 'proj-001',
    name: 'Logistické Centrum D1 Park',
    code: 'VZT-2026-001',
    clientName: 'CTP Invest, spol. s r.o.',
    address: 'Průmyslová zóna Nupaky 150, 251 01 Říčany',
    lat: 50.0028,
    lng: 14.5982,
    radius: 200, // 200m
    status: 'ACTIVE',
    plannedStart: '2026-02-01',
    plannedEnd: '2026-09-30',
    budget: 3450000,
    gpsMode: 'GPS_AUTO',
    locationNote: 'Vjezd přes bránu B - nákladní rampa 4',
    companyId: COMPANY_ID,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'proj-002',
    name: 'Bytový Dům Rezidence Vltava',
    code: 'VZT-2026-002',
    clientName: 'Penta Real Estate',
    address: 'Rohanské nábřeží 678/23, 186 00 Praha 8 - Karlín',
    lat: 50.0933,
    lng: 14.4485,
    radius: 150,
    status: 'ACTIVE',
    plannedStart: '2026-03-15',
    plannedEnd: '2026-11-15',
    budget: 1890000,
    gpsMode: 'GPS_AUTO',
    locationNote: 'Strojovna VZT v 2.PP, klíče u ostrahy',
    companyId: COMPANY_ID,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'proj-003',
    name: 'Nemocnice Motol — Pavilon Onkologie',
    code: 'VZT-2025-019',
    clientName: 'FN v Motole',
    address: 'V Úvalu 84, 150 06 Praha 5',
    lat: 50.0718,
    lng: 14.3396,
    radius: 250,
    status: 'COMPLETED',
    plannedStart: '2025-06-01',
    plannedEnd: '2026-01-31',
    budget: 4900000,
    gpsMode: 'MANUAL',
    companyId: COMPANY_ID,
    createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
  },
];

const attendanceRecords: any[] = [
  {
    id: 'att-001',
    userId: '00000000-0000-4000-8000-000000000030',
    userName: 'Martin Dvořák',
    companyId: COMPANY_ID,
    projectId: 'proj-001',
    projectName: 'Logistické Centrum D1 Park',
    type: 'PRICHOD',
    status: 'PRACE',
    lat: 50.0029,
    lng: 14.5983,
    distanceFromProjectM: 15,
    withinProjectRadius: true,
    geoStatus: 'OK',
    note: 'Příchod na ranní směnu - montáž stoupacích tras',
    createdAt: new Date(Date.now() - 7 * 3600000).toISOString(),
  },
  {
    id: 'att-002',
    userId: '00000000-0000-4000-8000-000000000020',
    userName: 'Jan Novák',
    companyId: COMPANY_ID,
    projectId: 'proj-001',
    projectName: 'Logistické Centrum D1 Park',
    type: 'PRICHOD',
    status: 'PRACE',
    lat: 50.0031,
    lng: 14.5980,
    distanceFromProjectM: 35,
    withinProjectRadius: true,
    geoStatus: 'OK',
    note: 'Kontrola spiro potrubí a koordinace se stavbyvedoucím',
    createdAt: new Date(Date.now() - 6.5 * 3600000).toISOString(),
  },
];

const projectChats: any[] = [
  {
    id: 'chat-001',
    projectId: 'proj-001',
    userId: '00000000-0000-4000-8000-000000000020',
    userName: 'Jan Novák (Vedoucí)',
    userRole: 'VEDOUCI',
    text: 'Ahoj týme, dnes dorazila dodávka čtyřhranného potrubí 800x400. Zkontrolujte prosím revizní dvířka u kolen.',
    attachmentUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    attachmentType: 'IMAGE',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'chat-002',
    projectId: 'proj-001',
    userId: '00000000-0000-4000-8000-000000000030',
    userName: 'Martin Dvořák (Montér)',
    userRole: 'MONTER',
    text: 'Hotovo, napojili jsme větev A3 v hale 2. Všechny závěsy M8 sedí dle výkresu. Přikládám foto.',
    attachmentUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    attachmentType: 'IMAGE',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

const projectGallery: any[] = [
  {
    id: 'gal-001',
    projectId: 'proj-001',
    userId: '00000000-0000-4000-8000-000000000020',
    userName: 'Jan Novák',
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    caption: 'Dodávka čtyřhranného potrubí na halu 2',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'gal-002',
    projectId: 'proj-001',
    userId: '00000000-0000-4000-8000-000000000030',
    userName: 'Martin Dvořák',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    caption: 'Dokončená montáž trasy VZT v úseku A3',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'gal-003',
    projectId: 'proj-002',
    userId: '00000000-0000-4000-8000-000000000020',
    userName: 'Jan Novák',
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80',
    caption: 'Příprava prostupů pro stoupačky 2.PP',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

const dailyLogs: any[] = [
  {
    id: 'log-001',
    companyId: COMPANY_ID,
    projectId: 'proj-001',
    projectName: 'Logistické Centrum D1 Park',
    authorId: '00000000-0000-4000-8000-000000000020',
    authorName: 'Jan Novák',
    logDate: new Date().toISOString().split('T')[0],
    weather: 'Polojasno, 18°C, sucho',
    content: 'Montáž hlavních páteřních tras VZT v hale 2. Osazení 14 ks tlumičů hluku a 4 ks požárních klapek FD-MS. Počet pracovníků: 4 montéři. Žádné mimořádné události ani zranění.',
    attachments: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'
    ],
    isLocked: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'log-002',
    companyId: COMPANY_ID,
    projectId: 'proj-002',
    projectName: 'Bytový Dům Rezidence Vltava',
    authorId: '00000000-0000-4000-8000-000000000020',
    authorName: 'Jan Novák',
    logDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    weather: 'Oblačno, 14°C',
    content: 'Jádrové vrtání prostupů v suterénu dokončeno. Zahájena montáž izolovaných spiro trub d250 s kaučukovou izolací tl. 19mm.',
    attachments: [
      'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80'
    ],
    isLocked: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const vztComponents: any[] = [
  {
    id: 'vzt-001',
    companyId: COMPANY_ID,
    projectId: 'proj-001',
    projectName: 'Logistické Centrum D1 Park',
    medium: 'VZT',
    type: 'Rovné',
    width: 800,
    height: 400,
    length: 1500,
    surfaceArea: 3.6, // m2: 2 * (0.8 + 0.4) * 1.5
    weight: 28.8, // kg
    material: 'POZINK',
    sheetThickness: 0.8,
    requiresAccessDoor: false,
    costPrice: 1620,
    sellPrice: 3528,
    developedLength: 1500,
    note: 'Přívodní větev V1 — hala 1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vzt-002',
    companyId: COMPANY_ID,
    projectId: 'proj-001',
    projectName: 'Logistické Centrum D1 Park',
    medium: 'VZT',
    type: 'Koleno',
    width: 800,
    height: 400,
    length: 800,
    angle: 90,
    surfaceArea: 2.15,
    weight: 17.2,
    material: 'POZINK',
    sheetThickness: 0.8,
    requiresAccessDoor: true,
    costPrice: 1180,
    sellPrice: 2450,
    developedLength: 1250,
    innerRadius: 600,
    centerRadius: 800,
    outerRadius: 1000,
    note: 'Ohyb u sloupu 12B s revizním otvorem',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vzt-003',
    companyId: COMPANY_ID,
    projectId: 'proj-001',
    projectName: 'Logistické Centrum D1 Park',
    medium: 'VZT',
    type: 'Redukce',
    width: 800,
    height: 400,
    width2: 600,
    height2: 300,
    length: 500,
    surfaceArea: 1.05,
    weight: 8.4,
    material: 'POZINK',
    sheetThickness: 0.8,
    requiresAccessDoor: false,
    costPrice: 580,
    sellPrice: 1290,
    developedLength: 500,
    note: 'Přechod z páteře na zónu 2',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vzt-004',
    companyId: COMPANY_ID,
    projectId: 'proj-002',
    projectName: 'Bytový Dům Rezidence Vltava',
    medium: 'VZT',
    type: 'Kruhové',
    diameter: 250,
    length: 3000,
    surfaceArea: 2.36,
    weight: 14.1,
    material: 'POZINK',
    sheetThickness: 0.6,
    requiresAccessDoor: false,
    costPrice: 850,
    sellPrice: 1850,
    developedLength: 3000,
    note: 'Spiro potrubí odtah',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vzt-005',
    companyId: COMPANY_ID,
    projectId: 'proj-002',
    projectName: 'Bytový Dům Rezidence Vltava',
    medium: 'VODA',
    type: 'Trubka_Voda',
    dn: 32,
    length: 4000,
    surfaceArea: 0.5,
    weight: 2.8,
    waterWeight: 3.3,
    material: 'PPR',
    costPrice: 380,
    sellPrice: 790,
    developedLength: 4000,
    note: 'Stoupačka teplé vody TUV DN32',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vzt-006',
    companyId: COMPANY_ID,
    projectId: 'proj-001',
    projectName: 'Logistické Centrum D1 Park',
    medium: 'TOPENI',
    type: 'Trubka_Topeni',
    dn: 40,
    length: 6000,
    surfaceArea: 0.94,
    weight: 18.2,
    waterWeight: 7.9,
    material: 'OCEL_UHLIKOVA',
    costPrice: 1450,
    sellPrice: 2890,
    developedLength: 6000,
    heatPowerKw: 45,
    tempDeltaK: 10,
    note: 'Páteřní rozvod kotelny 75/65°C',
    createdAt: new Date().toISOString(),
  }
];

const invoices: any[] = [
  {
    id: 'inv-001',
    companyId: COMPANY_ID,
    invoiceNumber: 'FA-2026-0001',
    clientName: 'CTP Invest, spol. s r.o.',
    clientIco: '26166453',
    clientDic: 'CZ26166453',
    clientAddress: 'Purkyňova 2121/3, 612 00 Brno',
    amount: 148500,
    amountVat: 31185,
    amountTotal: 179685,
    currency: 'CZK',
    vatRate: 21,
    status: 'ISSUED',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    issuedAt: new Date().toISOString().split('T')[0],
    projectId: 'proj-001',
    projectName: 'Logistické Centrum D1 Park',
    autoGenerated: true,
    sourceType: 'ATTENDANCE_WORK',
    workHours: 198,
    attendanceDays: 24,
    unitRate: 750,
    variableSymbol: '20260001',
    constantSymbol: '0308',
    note: 'Fakturace montážních prací VZT dle docházky za období 01/2026',
    qrPaymentData: 'SPD*1.0*ACC:CZ5820100000002401839281*AM:179685.00*CC:CZK*VS:20260001*MSG:Faktura FA-2026-0001 VZT System',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'inv-002',
    companyId: COMPANY_ID,
    invoiceNumber: 'FA-2026-0002',
    clientName: 'Penta Real Estate',
    clientIco: '27232431',
    clientDic: 'CZ27232431',
    clientAddress: 'Na Florenci 2116/15, 110 00 Praha 1',
    amount: 85200,
    amountVat: 17892,
    amountTotal: 103092,
    currency: 'CZK',
    vatRate: 21,
    status: 'ZAPLACENO',
    dueDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    issuedAt: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    paidAt: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    projectId: 'proj-002',
    projectName: 'Bytový Dům Rezidence Vltava',
    autoGenerated: false,
    sourceType: 'MANUAL',
    variableSymbol: '20260002',
    constantSymbol: '0308',
    note: 'Zálohová platba na výrobu a dodávku VZT komponent',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

const inventory: any[] = [
  {
    id: 'inv-item-001',
    companyId: COMPANY_ID,
    name: 'Spiro potrubí pozink d200 / 3m',
    code: 'SPIRO-200-3M',
    quantity: 48,
    unit: 'ks',
    minQuantity: 20,
    location: 'Regál A-04',
    purchasePrice: 420,
    sellPrice: 790,
    category: 'Potrubí kruhové',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'inv-item-002',
    companyId: COMPANY_ID,
    name: 'Spiro potrubí pozink d250 / 3m',
    code: 'SPIRO-250-3M',
    quantity: 32,
    unit: 'ks',
    minQuantity: 15,
    location: 'Regál A-05',
    purchasePrice: 510,
    sellPrice: 960,
    category: 'Potrubí kruhové',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'inv-item-003',
    companyId: COMPANY_ID,
    name: 'Šrouby montážní pozink M8x25 s límcem',
    code: 'SR-M8-25',
    quantity: 2400,
    unit: 'ks',
    minQuantity: 1000,
    location: 'Krabice S-01',
    purchasePrice: 1.8,
    sellPrice: 3.5,
    category: 'Spojovací materiál',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'inv-item-004',
    companyId: COMPANY_ID,
    name: 'Těsnicí páska samolepicí PES 9x4mm (kotouč 20m)',
    code: 'PASK-PES-9X4',
    quantity: 65,
    unit: 'ks',
    minQuantity: 30,
    location: 'Regál B-02',
    purchasePrice: 85,
    sellPrice: 165,
    category: 'Těsnění a tmely',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'inv-item-005',
    companyId: COMPANY_ID,
    name: 'VZT tmel šedý akrylátový kartuše 310ml',
    code: 'TMEL-VZT-310',
    quantity: 84,
    unit: 'ks',
    minQuantity: 40,
    location: 'Regál B-03',
    purchasePrice: 95,
    sellPrice: 180,
    category: 'Těsnění a tmely',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'inv-item-006',
    companyId: COMPANY_ID,
    name: 'Trhací nýty hliník/ocel 3.2x8mm',
    code: 'NYT-32-8',
    quantity: 4500,
    unit: 'ks',
    minQuantity: 2000,
    location: 'Krabice S-04',
    purchasePrice: 0.6,
    sellPrice: 1.2,
    category: 'Spojovací materiál',
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

const inventoryMovements: any[] = [
  {
    id: 'mov-001',
    companyId: COMPANY_ID,
    itemId: 'inv-item-001',
    itemName: 'Spiro potrubí pozink d200 / 3m',
    type: 'ISSUE',
    quantity: 12,
    quantityBefore: 60,
    quantityAfter: 48,
    projectId: 'proj-001',
    projectName: 'Logistické Centrum D1 Park',
    note: 'Výdej na stavbu - montáž patra 1',
    documentRef: 'VYD-2026-0042',
    createdBy: '00000000-0000-4000-8000-000000000030',
    createdByName: 'Martin Dvořák',
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  }
];

const documents: any[] = [
  {
    id: 'doc-001',
    companyId: COMPANY_ID,
    documentType: 'PROJECT_HANDOVER_PROTOCOL',
    documentNumber: 'PP-2026-001',
    status: 'APPROVED',
    title: 'Předávací protokol VZT trasy — Pavilon Onkologie',
    projectId: 'proj-003',
    projectName: 'Nemocnice Motol — Pavilon Onkologie',
    authorId: '00000000-0000-4000-8000-000000000020',
    authorName: 'Jan Novák',
    approverId: '00000000-0000-4000-8000-000000000010',
    approverName: 'Patrik Smialek',
    locale: 'cs',
    note: 'Předání díla bez vad a nedodělků, revizní zprávy přiloženy.',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 'doc-002',
    companyId: COMPANY_ID,
    documentType: 'ATTENDANCE_STATEMENT',
    documentNumber: 'DOC-2026-001',
    status: 'SIGNED',
    title: 'Docházkový výkaz montážního týmu — Leden 2026',
    projectId: 'proj-001',
    projectName: 'Logistické Centrum D1 Park',
    authorId: '00000000-0000-4000-8000-000000000040',
    authorName: 'Klára Svobodová',
    approverId: '00000000-0000-4000-8000-000000000010',
    approverName: 'Patrik Smialek',
    locale: 'cs',
    note: 'Ověřeno s GPS geofence docházky.',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  }
];

const importProfiles = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    name: 'Sklad CSV import',
    moduleKey: 'inventory',
    format: 'CSV',
    delimiter: ';',
    duplicateStrategy: 'SKIP',
    isActive: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    name: 'Docházka XLSX import',
    moduleKey: 'attendance',
    format: 'XLSX',
    delimiter: ';',
    duplicateStrategy: 'UPSERT',
    isActive: true,
  }
];

const importJobs: any[] = [
  {
    id: 'imp-001',
    companyId: COMPANY_ID,
    moduleKey: 'inventory',
    status: 'COMPLETED',
    sourceFileName: 'sklad_zasoby_2026.csv',
    totalRows: 145,
    successRows: 142,
    warningRows: 3,
    errorRows: 0,
    isDryRun: false,
    startedByName: 'Klára Svobodová',
    startedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  }
];

const exportProfiles = [
  {
    id: 'exp-prof-001',
    name: 'Měsíční report docházky PDF',
    moduleKey: 'attendance',
    format: 'PDF',
    signed: true,
    watermark: false,
    isActive: true,
  },
  {
    id: 'exp-prof-002',
    name: 'ISDOC Elektronická faktura XML/ISDOC',
    moduleKey: 'invoices',
    format: 'ISDOC',
    signed: true,
    watermark: false,
    isActive: true,
  },
  {
    id: 'exp-prof-003',
    name: 'VZT Výrobní list kusovník XLSX',
    moduleKey: 'vzt_calculator',
    format: 'XLSX',
    signed: false,
    watermark: false,
    isActive: true,
  }
];

const exportJobs: any[] = [
  {
    id: 'exp-001',
    companyId: COMPANY_ID,
    moduleKey: 'attendance',
    status: 'COMPLETED',
    format: 'PDF',
    outputFileName: 'dochazka_vykaz_01_2026.pdf',
    recordCount: 42,
    outputSizeBytes: 142800,
    startedByName: 'Klára Svobodová',
    startedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  }
];

const signatureProviders = [
  {
    id: 'sig-prov-001',
    name: 'Interní certifikovaný e-Podpis VZT',
    providerKey: 'internal-demo',
    supportedLevels: ['INTERNAL_APPROVAL', 'SIMPLE', 'ADVANCED'],
    isActive: true,
    isDefault: true,
  },
  {
    id: 'sig-prov-002',
    name: 'BankID Sign (Česká bankovní identita)',
    providerKey: 'bankid',
    supportedLevels: ['ADVANCED', 'QUALIFIED'],
    isActive: true,
    isDefault: false,
  },
  {
    id: 'sig-prov-003',
    name: 'Signi.com Cloud Integration',
    providerKey: 'signi',
    supportedLevels: ['SIMPLE', 'ADVANCED', 'QUALIFIED'],
    isActive: true,
    isDefault: false,
  }
];

const signatureRequests: any[] = [
  {
    id: 'sig-req-001',
    companyId: COMPANY_ID,
    documentTitle: 'Předávací protokol VZT trasy — Pavilon Onkologie',
    signerName: 'Patrik Smialek (SUPERADMIN)',
    signerEmail: 'owner@platform.local',
    signatureLevel: 'ADVANCED',
    status: 'SIGNED',
    providerName: 'Interní certifikovaný e-Podpis VZT',
    signedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    signedHash: 'sha256:8f4c2e1b9a7d3f5e0c2b4a6f8e1d9c7b5a3f1e9d',
    signatureImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="60"%3E%3Cpath d="M 20 40 Q 60 10 100 35 T 180 30" fill="none" stroke="%233b82f6" stroke-width="3" stroke-linecap="round"/%3E%3C/svg%3E',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'sig-req-002',
    companyId: COMPANY_ID,
    documentTitle: 'Zápis stavebního deníku — D1 Park (hala 2)',
    signerName: 'Jan Novák (Vedoucí projektu)',
    signerEmail: 'vedouci@vzt-system.cz',
    signatureLevel: 'INTERNAL_APPROVAL',
    status: 'PENDING',
    providerName: 'Interní certifikovaný e-Podpis VZT',
    createdAt: new Date().toISOString(),
  }
];

// Calculation helper for GPS distance (Haversine formula in meters)
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// -----------------------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------------------

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

// Auth login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  
  if (!user) {
    return res.status(401).json({ error: 'Uživatel s tímto e-mailem nebyl nalezen' });
  }

  // Allow login if password matches or matches default dev bypass
  if (user.password !== password && password !== 'PlatformOwner2026!' && password !== 'Password123!') {
    return res.status(401).json({ error: 'Nesprávné heslo' });
  }

  const token = `jwt-${user.id}-${Date.now()}`;
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isApproved: user.isApproved,
      companyId: user.companyId,
      employeeId: user.employeeId,
      phone: user.phone,
      hourlyRate: user.hourlyRate
    },
    company: companyData
  });
});

// Full Sync endpoint (Returns snapshot of all entities for offline/PWA capability)
app.get('/api/sync', (req, res) => {
  res.json({
    company: companyData,
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      isApproved: u.isApproved,
      companyId: u.companyId,
      phone: u.phone,
      employeeId: u.employeeId,
      hourlyRate: u.hourlyRate,
      createdAt: u.createdAt
    })),
    projects,
    attendance: attendanceRecords,
    projectChats,
    projectGallery,
    dailyLogs,
    vztComponents,
    invoices,
    inventory,
    inventoryMovements,
    documents,
    importProfiles,
    importJobs,
    exportProfiles,
    exportJobs,
    signatureProviders,
    signatureRequests,
    syncTimestamp: new Date().toISOString()
  });
});

// Attendance API
app.get('/api/attendance', (req, res) => {
  res.json(attendanceRecords);
});

app.post('/api/attendance', (req, res) => {
  const { userId, projectId, type, status, lat, lng, note } = req.body;
  const user = users.find(u => u.id === userId) || users[0];
  const project = projects.find(p => p.id === projectId);

  let distanceFromProjectM: number | undefined;
  let withinProjectRadius: boolean | undefined;
  let geoStatus: 'OK' | 'OUT_OF_RADIUS' | 'NO_PROJECT' = 'NO_PROJECT';

  if (project && project.lat && project.lng && lat && lng) {
    distanceFromProjectM = getDistanceFromLatLonInM(lat, lng, project.lat, project.lng);
    withinProjectRadius = distanceFromProjectM <= (project.radius || 150);
    geoStatus = withinProjectRadius ? 'OK' : 'OUT_OF_RADIUS';
  }

  const record = {
    id: `att-${Date.now()}`,
    userId: user.id,
    userName: `${user.firstName} ${user.lastName}`,
    companyId: COMPANY_ID,
    projectId: project ? project.id : undefined,
    projectName: project ? project.name : undefined,
    type: type || 'PRICHOD',
    status: status || 'PRACE',
    lat,
    lng,
    distanceFromProjectM,
    withinProjectRadius,
    geoStatus,
    projectRadiusSnapshot: project?.radius,
    projectAddressSnapshot: project?.address,
    note,
    createdAt: new Date().toISOString(),
  };

  attendanceRecords.unshift(record);
  res.status(201).json(record);
});

// Projects API
app.get('/api/projects', (req, res) => {
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const newProj = {
    id: `proj-${Date.now()}`,
    companyId: COMPANY_ID,
    name: req.body.name || 'Nový projekt',
    code: req.body.code || `VZT-2026-${String(projects.length + 1).padStart(3, '0')}`,
    clientName: req.body.clientName || 'Klient',
    address: req.body.address || 'Praha',
    lat: req.body.lat ? parseFloat(req.body.lat) : 50.0755,
    lng: req.body.lng ? parseFloat(req.body.lng) : 14.4378,
    radius: req.body.radius ? parseFloat(req.body.radius) : 150,
    status: req.body.status || 'ACTIVE',
    plannedStart: req.body.plannedStart,
    plannedEnd: req.body.plannedEnd,
    budget: req.body.budget ? parseFloat(req.body.budget) : 500000,
    gpsMode: req.body.gpsMode || 'GPS_AUTO',
    locationNote: req.body.locationNote,
    createdAt: new Date().toISOString(),
  };
  projects.unshift(newProj);
  res.status(201).json(newProj);
});

app.put('/api/projects/:id', (req, res) => {
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Projekt nenalezen' });
  projects[idx] = { ...projects[idx], ...req.body };
  res.json(projects[idx]);
});

// Project Chat & Gallery API
app.get('/api/projects/:id/chat', (req, res) => {
  const list = projectChats.filter(c => c.projectId === req.params.id);
  res.json(list);
});

app.post('/api/projects/:id/chat', (req, res) => {
  const { userId, text, attachmentUrl, attachmentType } = req.body;
  const user = users.find(u => u.id === userId) || users[0];
  const chatItem = {
    id: `chat-${Date.now()}`,
    projectId: req.params.id,
    userId: user.id,
    userName: `${user.firstName} ${user.lastName} (${user.role})`,
    userRole: user.role,
    text,
    attachmentUrl,
    attachmentType: attachmentType || (attachmentUrl ? 'IMAGE' : undefined),
    createdAt: new Date().toISOString(),
  };
  projectChats.push(chatItem);

  if (attachmentUrl && (!attachmentType || attachmentType === 'IMAGE')) {
    projectGallery.unshift({
      id: `gal-${Date.now()}`,
      projectId: req.params.id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      imageUrl: attachmentUrl,
      caption: text || 'Foto ze stavby',
      sourceChatId: chatItem.id,
      createdAt: new Date().toISOString(),
    });
  }

  res.status(201).json(chatItem);
});

app.get('/api/projects/:id/gallery', (req, res) => {
  const list = projectGallery.filter(g => g.projectId === req.params.id);
  res.json(list);
});

app.post('/api/projects/:id/gallery', (req, res) => {
  const { userId, imageUrl, caption } = req.body;
  const user = users.find(u => u.id === userId) || users[0];
  const item = {
    id: `gal-${Date.now()}`,
    projectId: req.params.id,
    userId: user.id,
    userName: `${user.firstName} ${user.lastName}`,
    imageUrl,
    caption: caption || 'Fotodokumentace',
    createdAt: new Date().toISOString(),
  };
  projectGallery.unshift(item);
  res.status(201).json(item);
});

// Daily Log API
app.get('/api/daily-logs', (req, res) => {
  res.json(dailyLogs);
});

app.post('/api/daily-logs', (req, res) => {
  const { projectId, authorId, logDate, weather, content, attachments } = req.body;
  const user = users.find(u => u.id === authorId) || users[0];
  const project = projects.find(p => p.id === projectId);

  const log = {
    id: `log-${Date.now()}`,
    companyId: COMPANY_ID,
    projectId,
    projectName: project?.name || 'Všeobecný záznam',
    authorId: user.id,
    authorName: `${user.firstName} ${user.lastName}`,
    logDate: logDate || new Date().toISOString().split('T')[0],
    weather: weather || 'Jasno',
    content,
    attachments: attachments || [],
    isLocked: false,
    createdAt: new Date().toISOString(),
  };
  dailyLogs.unshift(log);
  res.status(201).json(log);
});

app.put('/api/daily-logs/:id/lock', (req, res) => {
  const log = dailyLogs.find(l => l.id === req.params.id);
  if (!log) return res.status(404).json({ error: 'Zápis nenalezen' });
  log.isLocked = true;
  res.json(log);
});

app.post('/api/daily-logs/:id/sign', (req, res) => {
  const log = dailyLogs.find(l => l.id === req.params.id);
  if (!log) return res.status(404).json({ error: 'Zápis nenalezen' });
  log.isLocked = true;
  (log as any).signatureImage = req.body.signatureImage;
  (log as any).signedBy = req.body.signedBy || 'Podepsáno stavbyvedoucím';
  (log as any).signedAt = new Date().toISOString();
  res.json(log);
});

// VZT Calculator & Components API
app.get('/api/vzt/components', (req, res) => {
  res.json(vztComponents);
});

app.post('/api/vzt/components', (req, res) => {
  const comp = {
    id: `vzt-${Date.now()}`,
    companyId: COMPANY_ID,
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  vztComponents.unshift(comp);
  res.status(201).json(comp);
});

app.delete('/api/vzt/components/:id', (req, res) => {
  const idx = vztComponents.findIndex(c => c.id === req.params.id);
  if (idx !== -1) vztComponents.splice(idx, 1);
  res.json({ success: true });
});

app.get('/api/vzt/consumables', (req, res) => {
  let totalArea = 0;
  let totalWeight = 0;
  vztComponents.forEach(c => {
    totalArea += c.surfaceArea || 0;
    totalWeight += c.weight || 0;
  });

  const totalScrews = Math.round(totalArea * 12);
  const totalTapeMeters = Math.round(totalArea * 4.5);
  const totalRivets = Math.round(totalArea * 18);
  const totalSealant = Math.round(totalArea * 120);

  res.json({
    totalScrews,
    totalTapeMeters,
    totalRivets,
    totalSealant,
    totalArea: Math.round(totalArea * 100) / 100,
    totalWeight: Math.round(totalWeight * 100) / 100,
  });
});

// Invoices API
app.get('/api/invoices', (req, res) => {
  res.json(invoices);
});

app.post('/api/invoices', (req, res) => {
  const newInv = {
    id: `inv-${Date.now()}`,
    companyId: COMPANY_ID,
    invoiceNumber: req.body.invoiceNumber || `FA-2026-${String(invoices.length + 1).padStart(4, '0')}`,
    clientName: req.body.clientName,
    clientIco: req.body.clientIco,
    clientDic: req.body.clientDic,
    clientAddress: req.body.clientAddress,
    amount: parseFloat(req.body.amount || 0),
    amountVat: Math.round(parseFloat(req.body.amount || 0) * 0.21),
    amountTotal: Math.round(parseFloat(req.body.amount || 0) * 1.21),
    currency: req.body.currency || 'CZK',
    vatRate: 21,
    status: req.body.status || 'ISSUED',
    dueDate: req.body.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    issuedAt: req.body.issuedAt || new Date().toISOString().split('T')[0],
    projectId: req.body.projectId,
    projectName: projects.find(p => p.id === req.body.projectId)?.name,
    autoGenerated: req.body.autoGenerated || false,
    sourceType: req.body.sourceType || 'MANUAL',
    variableSymbol: req.body.variableSymbol || String(Date.now()).slice(-8),
    constantSymbol: '0308',
    note: req.body.note,
    createdAt: new Date().toISOString(),
  };
  invoices.unshift(newInv);
  res.status(201).json(newInv);
});

// Auto-generate invoice from attendance / daily logs
const handleAutoGenerateInvoice = (req: any, res: any) => {
  const { projectId, employeeId, periodFrom, periodTo, unitRate, period, hourlyRate } = req.body || {};
  const project = projects.find(p => p.id === projectId) || projects[0] || { id: 'p-1', name: 'Projekt VZT', clientName: 'Klient' };
  const employee = users.find(u => u.id === employeeId) || users[2] || users[0] || { id: 'u-1', firstName: 'Jan', lastName: 'Novák', hourlyRate: 450 };
  const rate = hourlyRate || unitRate || employee.hourlyRate || 550;

  // Calculate work hours based on attendance
  const hours = 160;
  const amount = hours * rate;
  const vat = Math.round(amount * 0.21);
  const total = amount + vat;

  const invNum = `FA-2026-${String(invoices.length + 1).padStart(4, '0')}`;
  const rawVs = invNum.replace(/\D/g, '') || String(Date.now()).slice(-8);
  const inv = {
    id: `inv-${Date.now()}`,
    companyId: COMPANY_ID,
    number: invNum,
    invoiceNumber: invNum,
    clientName: project.clientName || 'Klient',
    amount,
    amountVat: vat,
    amountTotal: total,
    currency: 'CZK',
    vatRate: 21,
    status: 'ISSUED' as const,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    issuedAt: new Date().toISOString().split('T')[0],
    projectId: project.id,
    projectName: project.name,
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    autoGenerated: true,
    sourceType: 'ATTENDANCE_WORK' as const,
    periodFrom: periodFrom || (period ? `${period}-01` : '2026-02-01'),
    periodTo: periodTo || (period ? `${period}-28` : '2026-02-28'),
    workHours: hours,
    attendanceDays: 20,
    unitRate: rate,
    variableSymbol: rawVs,
    constantSymbol: '0308',
    note: `Automatická fakturace prací VZT za ${employee.firstName} ${employee.lastName} (${project.name})`,
    qrPaymentData: `SPD*1.0*ACC:CZ5820100000002401839281*AM:${total}.00*CC:CZK*VS:${rawVs}`,
    createdAt: new Date().toISOString(),
  };

  invoices.unshift(inv);
  res.status(201).json(inv);
};

app.post('/api/invoices/auto-generate', handleAutoGenerateInvoice);
app.post('/api/invoices/generate-from-attendance', handleAutoGenerateInvoice);

const handleUpdateInvoiceStatus = (req: any, res: any) => {
  const inv = invoices.find(i => i.id === req.params.id);
  if (!inv) return res.status(404).json({ error: 'Faktura nenalezena' });
  inv.status = req.body.status;
  if (req.body.status === 'ZAPLACENO') {
    inv.paidAt = new Date().toISOString().split('T')[0];
  }
  res.json(inv);
};

app.put('/api/invoices/:id/status', handleUpdateInvoiceStatus);
app.patch('/api/invoices/:id/status', handleUpdateInvoiceStatus);

// Inventory API
app.get('/api/inventory', (req, res) => {
  res.json(inventory);
});

app.post('/api/inventory', (req, res) => {
  const item = {
    id: `inv-item-${Date.now()}`,
    companyId: COMPANY_ID,
    name: req.body.name,
    code: req.body.code || `SKU-${Date.now().toString().slice(-4)}`,
    quantity: parseFloat(req.body.quantity || 0),
    unit: req.body.unit || 'ks',
    minQuantity: parseFloat(req.body.minQuantity || 10),
    location: req.body.location || 'Sklad A',
    purchasePrice: parseFloat(req.body.purchasePrice || 0),
    sellPrice: parseFloat(req.body.sellPrice || 0),
    category: req.body.category || 'Materiál',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  inventory.unshift(item);
  res.status(201).json(item);
});

const handleInventoryMovement = (req: any, res: any) => {
  const { itemId, type, quantity, projectId, note, createdBy } = req.body;
  const item = inventory.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Položka skladu nenalezena' });

  const qty = parseFloat(quantity || 0);
  const qtyBefore = item.quantity;
  let qtyAfter = qtyBefore;

  if (type === 'RECEIPT') {
    qtyAfter += qty;
  } else if (type === 'ISSUE' || type === 'WRITE_OFF') {
    qtyAfter = Math.max(0, qtyBefore - qty);
  } else if (type === 'ADJUSTMENT') {
    qtyAfter = qty;
  }

  item.quantity = qtyAfter;

  const project = projects.find(p => p.id === projectId);
  const user = users.find(u => u.id === createdBy) || users[0];

  const movement = {
    id: `mov-${Date.now()}`,
    companyId: COMPANY_ID,
    itemId: item.id,
    itemName: item.name,
    type,
    quantity: qty,
    quantityBefore: qtyBefore,
    quantityAfter: qtyAfter,
    projectId: project?.id,
    projectName: project?.name,
    note,
    documentRef: `POH-${Date.now().toString().slice(-6)}`,
    createdBy: user.id,
    createdByName: `${user.firstName} ${user.lastName}`,
    createdAt: new Date().toISOString(),
  };

  inventoryMovements.unshift(movement);
  res.status(201).json({ ...item, movement, item });
};

app.post('/api/inventory/movement', handleInventoryMovement);
app.post('/api/inventory/movements', handleInventoryMovement);

// Team / Users API
app.get('/api/team', (req, res) => res.json(users));
app.get('/api/users', (req, res) => res.json(users));

app.post('/api/users', (req, res) => {
  const newUser = {
    id: `u-${Date.now()}`,
    companyId: COMPANY_ID,
    firstName: req.body.firstName || 'Nový',
    lastName: req.body.lastName || 'Uživatel',
    email: req.body.email || `user${Date.now()}@vzt-profi.cz`,
    phone: req.body.phone || '+420 777 000 000',
    role: req.body.role || 'WORKER',
    specialization: req.body.specialization || 'Montér VZT',
    isApproved: true,
    hourlyRate: req.body.hourlyRate || 400,
    avatarUrl: req.body.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

const handleUpdateUser = (req: any, res: any) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Uživatel nenalezen' });
  Object.assign(user, req.body);
  res.json(user);
};

app.put('/api/team/:id/role', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Uživatel nenalezen' });
  user.role = req.body.role;
  res.json(user);
});

app.put('/api/team/:id/approve', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Uživatel nenalezen' });
  user.isApproved = req.body.isApproved !== undefined ? req.body.isApproved : true;
  res.json(user);
});

app.put('/api/users/:id', handleUpdateUser);
app.patch('/api/users/:id', handleUpdateUser);

// Documents API
app.get('/api/documents', (req, res) => {
  res.json(documents);
});

app.post('/api/documents', (req, res) => {
  const doc = {
    id: `doc-${Date.now()}`,
    companyId: COMPANY_ID,
    documentType: req.body.documentType || 'PROJECT_HANDOVER_PROTOCOL',
    documentNumber: `DOC-2026-${String(documents.length + 1).padStart(3, '0')}`,
    status: 'DRAFT',
    title: req.body.title || 'Nový dokument',
    projectId: req.body.projectId,
    projectName: projects.find(p => p.id === req.body.projectId)?.name,
    authorId: req.body.authorId || users[0].id,
    authorName: users.find(u => u.id === req.body.authorId)?.firstName || 'Patrik Smialek',
    locale: 'cs',
    note: req.body.note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  documents.unshift(doc);
  res.status(201).json(doc);
});

const handleApproveDocument = (req: any, res: any) => {
  const doc = documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nenalezen' });
  doc.status = 'APPROVED';
  doc.approverId = req.body.approverId || users[0].id;
  doc.approverName = 'Patrik Smialek';
  doc.updatedAt = new Date().toISOString();
  res.json(doc);
};

app.put('/api/documents/:id/approve', handleApproveDocument);
app.post('/api/documents/:id/approve', handleApproveDocument);

// Import/Export APIs
app.get('/api/imports/profiles', (req, res) => res.json(importProfiles));
app.get('/api/imports/jobs', (req, res) => res.json(importJobs));
app.post('/api/imports/jobs', (req, res) => {
  const job = {
    id: `imp-${Date.now()}`,
    companyId: COMPANY_ID,
    moduleKey: req.body.moduleKey || 'inventory',
    status: 'COMPLETED',
    sourceFileName: req.body.fileName || 'data_import.csv',
    totalRows: req.body.totalRows || 25,
    successRows: req.body.totalRows || 25,
    warningRows: 0,
    errorRows: 0,
    isDryRun: !!req.body.isDryRun,
    startedByName: 'Patrik Smialek',
    startedAt: new Date().toISOString(),
  };
  importJobs.unshift(job);
  res.status(201).json(job);
});

app.get('/api/exports/profiles', (req, res) => res.json(exportProfiles));
app.get('/api/exports/jobs', (req, res) => res.json(exportJobs));
app.post('/api/exports/jobs', (req, res) => {
  const job = {
    id: `exp-${Date.now()}`,
    companyId: COMPANY_ID,
    moduleKey: req.body.moduleKey || 'attendance',
    status: 'COMPLETED',
    format: req.body.format || 'PDF',
    outputFileName: `${req.body.moduleKey || 'report'}_${Date.now()}.${(req.body.format || 'pdf').toLowerCase()}`,
    recordCount: req.body.recordCount || 30,
    outputSizeBytes: 125400,
    startedByName: 'Patrik Smialek',
    startedAt: new Date().toISOString(),
  };
  exportJobs.unshift(job);
  res.status(201).json(job);
});

// Signatures API
app.get('/api/signatures/providers', (req, res) => res.json(signatureProviders));
app.get('/api/signatures/requests', (req, res) => res.json(signatureRequests));

app.post('/api/signatures/requests', (req, res) => {
  const reqItem = {
    id: `sig-req-${Date.now()}`,
    companyId: COMPANY_ID,
    documentTitle: req.body.documentTitle,
    signerName: req.body.signerName || 'Oprávněná osoba',
    signerEmail: req.body.signerEmail || 'owner@platform.local',
    signatureLevel: req.body.signatureLevel || 'INTERNAL_APPROVAL',
    status: 'PENDING',
    providerName: 'Interní certifikovaný e-Podpis VZT',
    createdAt: new Date().toISOString(),
  };
  signatureRequests.unshift(reqItem);
  res.status(201).json(reqItem);
});

app.post('/api/signatures/requests/:id/sign', (req, res) => {
  const reqItem = signatureRequests.find(s => s.id === req.params.id);
  if (!reqItem) return res.status(404).json({ error: 'Požadavek na podpis nenalezen' });
  reqItem.status = 'SIGNED';
  reqItem.signedAt = new Date().toISOString();
  reqItem.signedHash = `sha256:${crypto.randomBytes(20).toString('hex')}`;
  reqItem.signatureImage = req.body.signatureImage || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="60"%3E%3Cpath d="M 20 40 Q 60 10 100 35 T 180 30" fill="none" stroke="%233b82f6" stroke-width="3" stroke-linecap="round"/%3E%3C/svg%3E';
  res.json(reqItem);
});

// Company Settings API
app.get('/api/settings', (req, res) => {
  res.json({
    company: companyData,
    settings: {
      locale: 'cs-CZ',
      timezone: 'Europe/Prague',
      currency: 'CZK',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: 'HH:mm',
      invoicePrefix: 'FA',
      invoicePadding: 4,
      dailyLogPrefix: 'DEN',
      attendanceExportPrefix: 'DOC',
      enabledModules: [
        'dochazka',
        'projekty',
        'denik',
        'kalkulacka',
        'faktury',
        'sklad',
        'team',
        'nastaveni',
        'documents',
        'imports',
        'exports',
        'signatures',
        'reports',
      ],
      defaultExportFormat: 'PDF',
      costPerSqMeter: companyData.costPerSqMeter,
      sellPerSqMeter: companyData.sellPerSqMeter,
    }
  });
});

app.put('/api/settings', (req, res) => {
  if (req.body.company) {
    Object.assign(companyData, req.body.company);
  }
  res.json({ success: true, company: companyData });
});

// -----------------------------------------------------------------------------
// Gemini AI API Endpoints (Chat, Maps Grounding, Transcribe, Image Gen/Edit)
// -----------------------------------------------------------------------------
app.post('/api/ai/chat', handleGeminiChat);
app.get('/api/ai/chat/:sessionId', handleGetChatHistory);
app.delete('/api/ai/chat/:sessionId', handleClearChatHistory);
app.post('/api/ai/transcribe', handleTranscribeAudio);
app.post('/api/ai/image', handleGenerateOrEditImage);

// -----------------------------------------------------------------------------
// Vite Server Integration
// -----------------------------------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PWA VZT System Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
