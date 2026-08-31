import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { AttendanceView } from './components/AttendanceView';
import { ProjectsView } from './components/ProjectsView';
import { VztCalculatorView } from './components/VztCalculatorView';
import { DailyLogView } from './components/DailyLogView';
import { InvoicesView } from './components/InvoicesView';
import { WarehouseView } from './components/WarehouseView';
import { DocumentsView } from './components/DocumentsView';
import { SignaturesView } from './components/SignaturesView';
import { ImportsExportsView } from './components/ImportsExportsView';
import { TeamView } from './components/TeamView';
import { SettingsView } from './components/SettingsView';
import { SaasLicensingView } from './components/SaasLicensingView';
import { DistributionView } from './components/DistributionView';
import { AiAssistantView } from './components/AiAssistantView';
import { CollisionsQrView } from './components/CollisionsQrView';
import { MonterInvoicesView } from './components/MonterInvoicesView';
import { ReportsView } from './components/ReportsView';
import { PrintView } from './components/PrintView';
import { TroubleshootingDoctorView } from './components/TroubleshootingDoctorView';
import { CloudflareTunnelModal } from './components/CloudflareTunnelModal';

import {
  User,
  UserRole,
  Project,
  AttendanceRecord,
  VztComponent,
  ConsumablesSummary,
  DailyLog,
  Invoice,
  InventoryItem,
  Document as DocumentType,
  SignatureRequest,
  ImportProfile,
  ExportJob,
  CompanySettings,
  ProjectComment,
  ProjectPhoto,
  PlatformTenant,
  CatalogItem,
  Supplier,
  PurchaseRequest,
  PurchaseOrder,
  SiteCollision,
  QrLabelSpec,
  MonterInvoiceClaim,
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('prehled');
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showCloudflareModal, setShowCloudflareModal] = useState<boolean>(false);

  // Connection listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // App Data States
  const [currentUser, setCurrentUser] = useState<User>({
    id: '00000000-0000-4000-8000-000000000001',
    companyId: '00000000-0000-4000-8000-000000000001',
    email: 'owner@platform.local',
    firstName: 'Patrik',
    lastName: 'Smialek',
    role: 'SUPERADMIN',
    isApproved: true,
    hourlyRate: 750,
    employeeId: 'PLATFORM-OWNER-01',
    phone: '+420 777 000 001',
    twoFactorEnabled: true,
    createdAt: new Date().toISOString(),
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [vztComponents, setVztComponents] = useState<VztComponent[]>([]);
  const [consumables, setConsumables] = useState<ConsumablesSummary>({
    totalArea: 0,
    totalWeight: 0,
    totalScrews: 0,
    totalTapeMeters: 0,
    totalRivets: 0,
    totalSealant: 0,
  });
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [signatures, setSignatures] = useState<SignatureRequest[]>([]);
  const [importProfiles, setImportProfiles] = useState<ImportProfile[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: 'Platform Owner HQ / VZT System s.r.o.',
    ico: '28471923',
    dic: 'CZ28471923',
    bankAccount: '2401839281/2010',
    bankIban: 'CZ5820100000002401839281',
    bankSwift: 'FIOBCZPPXXX',
    costPerSqMeter: 450,
    sellPerSqMeter: 980,
    sheetMetalDensity: 7.85,
    weightCoefficient: 0.9,
    surfaceAreaReserveFactor: 1.15,
    accessDoorStraightThresholdM: 4,
    accessDoorElbowThresholdDeg: 45,
    geofenceRadiusMeters: 150,
    requireGps: true,
    allowManualEdit: false,
    allowBackfill: true,
    autoBreakMinutes: 30,
    roundingMinutes: 5,
    jwtExpiresInMinutes: 480,
    twoFactorRequired: false,
    require2faForSignatures: true,
    passwordMinLength: 10,
    invoicePrefix: 'FA',
    dailyLogPrefix: 'DEN',
    attendanceExportPrefix: 'DOC',
    handoverPrefix: 'PP',
    defaultVatRate: 21,
    marginPercent: 45,
    modulesEnabled: {
      vztConfigurator: true,
      gpsAttendance: true,
      dailyLog: true,
      invoicing: true,
      warehouse: true,
      signatures: true,
      distribution: true,
      collisions: true,
      monterInvoices: true,
      aiAutoDetect: true,
      saasLicensing: true,
      reports: true,
    },
  });

  const [projectComments, setProjectComments] = useState<ProjectComment[]>([]);
  const [projectPhotos, setProjectPhotos] = useState<ProjectPhoto[]>([]);

  // Platform & SaaS Tenants
  const [tenants, setTenants] = useState<PlatformTenant[]>([
    {
      id: 'tenant-001',
      name: 'VZT System s.r.o. (HQ)',
      ico: '28471923',
      ownerEmail: 'owner@platform.local',
      tier: 'ENTERPRISE',
      maxUsers: 999,
      storageLimitGb: 1000,
      status: 'ACTIVE',
      validUntil: '2028-12-31',
      createdAt: '2026-01-01',
      activeModules: ['all'],
    },
    {
      id: 'tenant-002',
      name: 'Klimaservis Praha spol. s r.o.',
      ico: '19482011',
      ownerEmail: 'reditel@klimaservis-praha.cz',
      tier: 'PRO',
      maxUsers: 40,
      storageLimitGb: 200,
      status: 'ACTIVE',
      validUntil: '2027-04-15',
      createdAt: '2026-02-10',
      activeModules: ['dochazka', 'projekty', 'denik', 'kalkulacka', 'faktury'],
    },
    {
      id: 'tenant-003',
      name: 'Moravia Air Conditioning s.r.o.',
      ico: '48201948',
      ownerEmail: 'jednatel@moravia-air.cz',
      tier: 'STANDARD',
      maxUsers: 15,
      storageLimitGb: 50,
      status: 'ACTIVE',
      validUntil: '2026-11-30',
      createdAt: '2026-03-01',
      activeModules: ['dochazka', 'projekty', 'denik'],
    },
  ]);

  // Distribution Data
  const [catalog, setCatalog] = useState<CatalogItem[]>([
    {
      id: 'cat-001',
      sku: 'SPIRO-200-3M',
      name: 'Spiro potrubí pozink d200 / 3m',
      category: 'SPIRO',
      manufacturer: 'Lindab CZ',
      unit: 'ks',
      standardPrice: 790,
      wholesalePrice: 420,
      inStock: 48,
      leadTimeDays: 1,
    },
    {
      id: 'cat-002',
      sku: 'SPIRO-250-3M',
      name: 'Spiro potrubí pozink d250 / 3m',
      category: 'SPIRO',
      manufacturer: 'Lindab CZ',
      unit: 'ks',
      standardPrice: 960,
      wholesalePrice: 510,
      inStock: 32,
      leadTimeDays: 1,
    },
    {
      id: 'cat-003',
      sku: 'KLAP-POZ-800x400',
      name: 'Požární klapka FD-MS 800x400 EIS90',
      category: 'KLAPKY',
      manufacturer: 'Trox / Mandík',
      unit: 'ks',
      standardPrice: 5800,
      wholesalePrice: 3950,
      inStock: 12,
      leadTimeDays: 3,
    },
    {
      id: 'cat-004',
      sku: 'TLUM-THP-800x400-1000',
      name: 'Tlumič hluku buňkový THP 800x400 L=1000mm',
      category: 'TLUMICE',
      manufacturer: 'Systemair',
      unit: 'ks',
      standardPrice: 4200,
      wholesalePrice: 2850,
      inStock: 8,
      leadTimeDays: 2,
    },
    {
      id: 'cat-005',
      sku: 'SPOJ-M8-ZAVIT-2M',
      name: 'Závitová tyč pozink M8 / 2m (svazek 25 ks)',
      category: 'SPOJOVACI',
      manufacturer: 'Hilti / Fischer',
      unit: 'bal',
      standardPrice: 1250,
      wholesalePrice: 780,
      inStock: 15,
      leadTimeDays: 1,
    },
    {
      id: 'cat-006',
      sku: 'CHEM-TMEL-PU-310ML',
      name: 'VZT Tmel polyuretanový 310ml šedý',
      category: 'CHEMIE',
      manufacturer: 'Den Braven',
      unit: 'ks',
      standardPrice: 145,
      wholesalePrice: 85,
      inStock: 96,
      leadTimeDays: 1,
    },
  ]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: 'sup-001',
      name: 'Lindab s.r.o.',
      ico: '49688481',
      dic: 'CZ49688481',
      contactPerson: 'Ing. Petr Kovařík',
      email: 'objednavky@lindab.cz',
      phone: '+420 234 123 456',
      rating: 5,
      discountPercent: 38,
      paymentTermsDays: 30,
    },
    {
      id: 'sup-002',
      name: 'Systemair a.s.',
      ico: '26471923',
      dic: 'CZ26471923',
      contactPerson: 'Miroslav Beneš',
      email: 'obchod@systemair.cz',
      phone: '+420 284 999 888',
      rating: 5,
      discountPercent: 35,
      paymentTermsDays: 45,
    },
    {
      id: 'sup-003',
      name: 'Trox CZ s.r.o.',
      ico: '45781920',
      dic: 'CZ45781920',
      contactPerson: 'Lucie Nováková',
      email: 'poptavky@trox.cz',
      phone: '+420 222 333 444',
      rating: 4,
      discountPercent: 28,
      paymentTermsDays: 30,
    },
  ]);

  const [rfqs, setRfqs] = useState<PurchaseRequest[]>([
    {
      id: 'rfq-001',
      rfqNumber: 'RFQ-2026-001',
      projectId: 'proj-001',
      projectName: 'Logistické Centrum D1 Park',
      status: 'SENT_TO_SUPPLIERS',
      itemsCount: 14,
      estimatedTotal: 248000,
      requiredDate: '2026-03-20',
      createdAt: new Date().toISOString(),
    },
  ]);

  const [orders, setOrders] = useState<PurchaseOrder[]>([
    {
      id: 'po-001',
      poNumber: 'PO-2026-001',
      supplierId: 'sup-001',
      supplierName: 'Lindab s.r.o.',
      projectId: 'proj-001',
      projectName: 'Logistické Centrum D1 Park',
      totalAmount: 142500,
      status: 'CONFIRMED',
      expectedDelivery: '2026-03-12',
      createdAt: new Date().toISOString(),
    },
  ]);

  // Collisions & QR Labels
  const [collisions, setCollisions] = useState<SiteCollision[]>([
    {
      id: 'col-001',
      projectId: 'proj-001',
      projectName: 'Logistické Centrum D1 Park',
      title: 'Křížení VZT potrubí 800x400 s ležatou kanalizací DN110',
      location: '1.PP Strojovna VZT u sloupu S-4',
      severity: 'HIGH',
      conflictingTrade: 'ZTI',
      status: 'IN_PROGRESS',
      reportedByName: 'Jan Novák (Vedoucí stavby)',
      photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80',
      description: 'Potrubí 800x400 koliduje se spádovým odpadem ZTI. Navržena snížená přechodka 1000x300 při zachování ekvivalentního průřezu.',
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
    {
      id: 'col-002',
      projectId: 'proj-002',
      projectName: 'Bytový Dům Rezidence Vltava',
      title: 'Kabelová trasa VN v koridoru stoupačky V1',
      location: '2.NP šachta Š-2',
      severity: 'CRITICAL',
      conflictingTrade: 'ELEKTRO',
      status: 'OPEN',
      reportedByName: 'Martin Dvořák (Montér)',
      photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      description: 'Silový kabelový žlab brání osazení požární klapky FD-MS. Vyžadována koordinace s hlavním inženýrem elektro.',
      createdAt: new Date().toISOString(),
    },
  ]);

  const [qrLabels, setQrLabels] = useState<QrLabelSpec[]>([
    {
      id: 'qr-001',
      componentType: 'Čtyřhranné potrubí rovné',
      tag: 'VZT-A1-001',
      projectCode: 'VZT-2026-001',
      dimensions: '800x400 L=1500',
      positionNumber: 'Poz. 014',
      floor: '2.NP',
      systemBranch: 'Přívod V1',
      qrPayload: 'https://zoom-pro.app/verify/VZT-A1-001',
      isPrinted: true,
    },
    {
      id: 'qr-002',
      componentType: 'Koleno 90° s revizí',
      tag: 'VZT-A1-002',
      projectCode: 'VZT-2026-001',
      dimensions: '800x400 R=150',
      positionNumber: 'Poz. 015',
      floor: '2.NP',
      systemBranch: 'Přívod V1',
      qrPayload: 'https://zoom-pro.app/verify/VZT-A1-002',
      isPrinted: false,
    },
    {
      id: 'qr-003',
      componentType: 'Spiro potrubí d250',
      tag: 'VZT-B2-010',
      projectCode: 'VZT-2026-002',
      dimensions: 'd250 L=3000',
      positionNumber: 'Poz. 042',
      floor: '1.PP',
      systemBranch: 'Odtah O2',
      qrPayload: 'https://zoom-pro.app/verify/VZT-B2-010',
      isPrinted: false,
    },
  ]);

  // Monter Claims
  const [monterClaims, setMonterClaims] = useState<MonterInvoiceClaim[]>([
    {
      id: 'claim-001',
      monterId: '00000000-0000-4000-8000-000000000030',
      monterName: 'Martin Dvořák (Montér I.)',
      projectId: 'proj-001',
      projectName: 'Logistické Centrum D1 Park',
      period: '02/2026',
      hoursWorked: 168,
      surfaceM2Mounted: 420,
      linearMetersMounted: 280,
      hourlyClaimAmount: 63840,
      pieceRateClaimAmount: 27300,
      totalAmount: 91140,
      status: 'APPROVED',
      approvedByName: 'Jan Novák (Vedoucí)',
      createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    },
    {
      id: 'claim-002',
      monterId: '00000000-0000-4000-8000-000000000050',
      monterName: 'Montážní Četa Alfa (Subdodávka)',
      projectId: 'proj-002',
      projectName: 'Bytový Dům Rezidence Vltava',
      period: '02/2026',
      hoursWorked: 140,
      surfaceM2Mounted: 310,
      linearMetersMounted: 195,
      hourlyClaimAmount: 53200,
      pieceRateClaimAmount: 20150,
      totalAmount: 73350,
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
    },
  ]);

  // Initial Fetch & Refresh from API
  const fetchData = useCallback(async () => {
    setIsSyncing(true);
    const fetchJson = async <T,>(url: string, fallback: T): Promise<T> => {
      try {
        const r = await fetch(url);
        if (!r.ok) return fallback;
        const contentType = r.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await r.json();
        }
        return fallback;
      } catch {
        return fallback;
      }
    };

    try {
      const [
        projRes,
        attRes,
        vztRes,
        consRes,
        logsRes,
        invRes,
        whRes,
        docRes,
        sigRes,
        usersRes,
        setRes,
      ] = await Promise.all([
        fetchJson('/api/projects', []),
        fetchJson('/api/attendance', []),
        fetchJson('/api/vzt/components', []),
        fetchJson('/api/vzt/consumables', {
          totalArea: 0,
          totalWeight: 0,
          totalScrews: 0,
          totalTapeMeters: 0,
          totalRivets: 0,
          totalSealant: 0,
        }),
        fetchJson('/api/daily-logs', []),
        fetchJson('/api/invoices', []),
        fetchJson('/api/inventory', []),
        fetchJson('/api/documents', []),
        fetchJson('/api/signatures/requests', []),
        fetchJson('/api/users', []),
        fetchJson('/api/settings', null),
      ]);

      if (Array.isArray(projRes) && projRes.length > 0) setProjects(projRes);
      if (Array.isArray(attRes) && attRes.length > 0) setAttendance(attRes);
      if (Array.isArray(vztRes) && vztRes.length > 0) setVztComponents(vztRes);
      if (consRes) setConsumables(consRes);
      if (Array.isArray(logsRes) && logsRes.length > 0) setDailyLogs(logsRes);
      if (Array.isArray(invRes) && invRes.length > 0) setInvoices(invRes);
      if (Array.isArray(whRes) && whRes.length > 0) setInventory(whRes);
      if (Array.isArray(docRes) && docRes.length > 0) setDocuments(docRes);
      if (Array.isArray(sigRes) && sigRes.length > 0) setSignatures(sigRes);
      if (Array.isArray(usersRes) && usersRes.length > 0) setUsers(usersRes);
      if (setRes && setRes.company) {
        setSettings(prev => ({
          ...prev,
          ...setRes.settings,
          companyName: setRes.company.name,
          ico: setRes.company.ico,
          dic: setRes.company.dic,
          bankAccount: setRes.company.bankAccount,
          bankIban: setRes.company.bankIban,
          bankSwift: setRes.company.bankSwift,
          costPerSqMeter: setRes.company.costPerSqMeter,
          sellPerSqMeter: setRes.company.sellPerSqMeter,
        }));
      }

      setImportProfiles([
        { id: 'ip-1', name: 'Import položek VZT z Excelu', format: 'XLSX', isActive: true },
        { id: 'ip-2', name: 'Import montérů ze mzdového systému', format: 'CSV', isActive: true },
        { id: 'ip-3', name: 'Import skladových zásob (Pohoda XML)', format: 'XML', isActive: true },
      ]);

      setExportJobs([
        {
          id: 'exp-1',
          name: 'Měsíční výkaz docházky - Stavba D1',
          status: 'COMPLETED',
          format: 'PDF',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'exp-2',
          name: 'ISDOC elektronická faktura FA-2026-0001',
          status: 'COMPLETED',
          format: 'ISDOC',
          createdAt: new Date().toISOString(),
        },
      ]);

      setLastSyncTime(new Date());
      setIsOnline(true);
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleSwitchRole = (role: UserRole) => {
    setCurrentUser(prev => ({ ...prev, role }));
  };

  const handleAddAttendance = async (data: any) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newRec = await res.json();
        setAttendance(prev => [newRec, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddProject = async (data: any) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newProj = await res.json();
        setProjects(prev => [newProj, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddProjectComment = async (data: { projectId: string; authorName: string; text: string; imageUrl?: string }) => {
    const comment: ProjectComment = {
      id: `c-${Date.now()}`,
      projectId: data.projectId,
      authorName: data.authorName || `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`,
      text: data.text,
      imageUrl: data.imageUrl,
      createdAt: new Date().toISOString(),
    };
    setProjectComments(prev => [comment, ...prev]);
  };

  const handleAddProjectPhoto = async (data: { projectId: string; caption: string; url: string; category: string }) => {
    const photo: ProjectPhoto = {
      id: `p-${Date.now()}`,
      projectId: data.projectId,
      caption: data.caption,
      url: data.url,
      category: data.category,
      createdAt: new Date().toISOString(),
    };
    setProjectPhotos(prev => [photo, ...prev]);
  };

  const handleAddVztComponent = async (data: any) => {
    try {
      const res = await fetch('/api/vzt/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newComp = await res.json();
        setVztComponents(prev => [newComp, ...prev]);
        const consRes = await fetch('/api/vzt/consumables').then(r => (r.ok ? r.json() : null)).catch(() => null);
        if (consRes) setConsumables(consRes);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVztComponent = async (id: string) => {
    try {
      await fetch(`/api/vzt/components/${id}`, { method: 'DELETE' });
      setVztComponents(prev => prev.filter(c => c.id !== id));
      const consRes = await fetch('/api/vzt/consumables').then(r => (r.ok ? r.json() : null)).catch(() => null);
      if (consRes) setConsumables(consRes);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDailyLog = async (data: any) => {
    try {
      const res = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newLog = await res.json();
        setDailyLogs(prev => [newLog, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignDailyLog = async (id: string, signatureImage: string) => {
    try {
      const res = await fetch(`/api/daily-logs/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureImage, signedBy: `${currentUser.firstName} ${currentUser.lastName}` }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDailyLogs(prev => prev.map(l => (l.id === id ? updated : l)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateInvoiceFromAttendance = async (projectIdOrData: any, period?: string, hourlyRate?: number) => {
    try {
      const payload = typeof projectIdOrData === 'object' && projectIdOrData !== null
        ? projectIdOrData
        : { projectId: projectIdOrData, period, hourlyRate };

      const res = await fetch('/api/invoices/generate-from-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newInv = await res.json();
        setInvoices(prev => [newInv, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateInvoiceStatus = async (id: string, status: any) => {
    try {
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoices(prev => prev.map(i => (i.id === id ? updated : i)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWarehouseMovement = async (data: any) => {
    try {
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, createdBy: currentUser.id, createdByName: `${currentUser.firstName} ${currentUser.lastName}` }),
      });
      if (res.ok) {
        const updatedItem = await res.json();
        if (updatedItem?.id) {
          setInventory(prev => prev.map(i => (i.id === updatedItem.id ? updatedItem : i)));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDocument = async (data: any) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, authorId: currentUser.id, authorName: `${currentUser.firstName} ${currentUser.lastName}` }),
      });
      if (res.ok) {
        const newDoc = await res.json();
        setDocuments(prev => [newDoc, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverId: currentUser.id, approverName: `${currentUser.firstName} ${currentUser.lastName}` }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDocuments(prev => prev.map(d => (d.id === id ? updated : d)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteSignature = async (id: string, signatureImage: string) => {
    try {
      const res = await fetch(`/api/signatures/requests/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureImage }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSignatures(prev => prev.map(s => (s.id === id ? updated : s)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerExport = async (profileId: string, format: string) => {
    try {
      const res = await fetch('/api/exports/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleKey: 'attendance', format, recordCount: attendance.length }),
      });
      if (res.ok) {
        const job = await res.json();
        setExportJobs(prev => [job, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUser = async (data: any) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newUser = await res.json();
        setUsers(prev => [...prev, newUser]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<CompanySettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: newSettings, settings: newSettings }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, ...newSettings }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header Bar */}
      <Header
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
        onOpenQuickAttendance={() => setActiveTab('dochazka')}
        onOpenCloudflareTunnel={() => setShowCloudflareModal(true)}
      />

      {/* Navigation Ribbon */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-cyan-400 font-mono text-sm space-x-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Načítání platformy Zoom Pro VZT...</span>
          </div>
        ) : (
          <>
            {activeTab === 'prehled' && (
              <DashboardView
                currentUser={currentUser}
                projects={projects}
                attendance={attendance}
                invoices={invoices}
                vztComponents={vztComponents}
                inventory={inventory}
                dailyLogs={dailyLogs}
                monterClaims={monterClaims}
                consumables={consumables}
                settings={settings}
                onNavigate={t => setActiveTab(t as NavTab)}
              />
            )}

            {activeTab === 'dochazka' && (
              <AttendanceView
                currentUser={currentUser}
                projects={projects}
                attendance={attendance}
                onAddAttendance={handleAddAttendance}
              />
            )}

            {activeTab === 'projekty' && (
              <ProjectsView
                projects={projects}
                comments={projectComments}
                photos={projectPhotos}
                onAddComment={handleAddProjectComment}
                onAddPhoto={handleAddProjectPhoto}
                onAddProject={handleAddProject}
              />
            )}

            {activeTab === 'kalkulacka' && (
              <VztCalculatorView
                projects={projects}
                components={vztComponents}
                consumables={consumables}
                costPerSqMeter={settings.costPerSqMeter}
                sellPerSqMeter={settings.sellPerSqMeter}
                onAddComponent={handleAddVztComponent}
                onDeleteComponent={handleDeleteVztComponent}
              />
            )}

            {activeTab === 'denik' && (
              <DailyLogView
                currentUser={currentUser}
                projects={projects}
                dailyLogs={dailyLogs}
                onAddDailyLog={handleAddDailyLog}
                onSignDailyLog={handleSignDailyLog}
              />
            )}

            {activeTab === 'faktury' && (
              <InvoicesView
                invoices={invoices}
                projects={projects}
                attendance={attendance}
                onGenerateFromAttendance={handleGenerateInvoiceFromAttendance}
                onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
              />
            )}

            {activeTab === 'monteri' && (
              <MonterInvoicesView
                claims={monterClaims}
                onAddClaim={claim => setMonterClaims(prev => [{ ...claim, id: `claim-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev])}
                onApproveClaim={id => setMonterClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'APPROVED', approvedByName: `${currentUser.firstName} ${currentUser.lastName}` } : c))}
              />
            )}

            {activeTab === 'distribuce' && (
              <DistributionView
                catalog={catalog}
                suppliers={suppliers}
                rfqs={rfqs}
                orders={orders}
                onAddCatalogItem={item => setCatalog(prev => [{ ...item, id: `cat-${Date.now()}` }, ...prev])}
                onAddSupplier={sup => setSuppliers(prev => [{ ...sup, id: `sup-${Date.now()}` }, ...prev])}
                onAddRfq={rfq => setRfqs(prev => [{ ...rfq, id: `rfq-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev])}
                onAddOrder={order => setOrders(prev => [{ ...order, id: `po-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev])}
                onUpdateOrderStatus={(id, status) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))}
              />
            )}

            {activeTab === 'sklad' && (
              <WarehouseView
                inventory={inventory}
                onAddMovement={handleAddWarehouseMovement}
                onAddItem={async () => {}}
              />
            )}

            {activeTab === 'kolize' && (
              <CollisionsQrView
                collisions={collisions}
                qrLabels={qrLabels}
                onAddCollision={col => setCollisions(prev => [{ ...col, id: `col-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev])}
                onUpdateCollisionStatus={(id, status) => setCollisions(prev => prev.map(c => c.id === id ? { ...c, status } : c))}
                onPrintQrLabel={id => setQrLabels(prev => prev.map(l => l.id === id ? { ...l, isPrinted: true } : l))}
              />
            )}

            {activeTab === 'ai' && (
              <AiAssistantView
                projects={projects}
                onAddDetectedComponent={comp => {
                  handleAddVztComponent(comp);
                  setActiveTab('kalkulacka');
                }}
              />
            )}

            {activeTab === 'dokumenty' && (
              <DocumentsView
                currentUser={currentUser}
                projects={projects}
                documents={documents}
                onAddDocument={handleAddDocument}
                onApproveDocument={handleApproveDocument}
              />
            )}

            {activeTab === 'podpisy' && (
              <SignaturesView
                currentUser={currentUser}
                signatureRequests={signatures}
                onCompleteSignature={handleCompleteSignature}
              />
            )}

            {activeTab === 'exporty' && (
              <ImportsExportsView
                profiles={importProfiles}
                exportJobs={exportJobs}
                onTriggerExport={handleTriggerExport}
              />
            )}

            {activeTab === 'tisk' && (
              <PrintView
                projects={projects}
                vztComponents={vztComponents}
                qrLabels={qrLabels}
              />
            )}

            {activeTab === 'doctor' && (
              <TroubleshootingDoctorView
                currentUser={currentUser}
              />
            )}

            {activeTab === 'saas' && (
              <SaasLicensingView
                tenants={tenants}
                onUpdateTenant={(id, updates) => setTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))}
                onAddTenant={t => setTenants(prev => [{ ...t, id: `tenant-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }, ...prev])}
              />
            )}

            {activeTab === 'tym' && (
              <TeamView
                users={users}
                onUpdateUser={handleUpdateUser}
                onAddUser={handleAddUser}
              />
            )}

            {activeTab === 'nastaveni' && (
              <SettingsView
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            )}
          </>
        )}
      </main>

      {/* Cloudflare 24/7 Always-On Tunnel Modal */}
      <CloudflareTunnelModal
        isOpen={showCloudflareModal}
        onClose={() => setShowCloudflareModal(false)}
      />

      {/* Footer */}
      <footer id="app-footer" className="border-t border-slate-900 bg-slate-950/90 py-3.5 px-4 sm:px-8 text-xs font-mono max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-slate-500 text-center md:text-left">
            <span>Zoom Pro (PWA VZT System v1.2.0) • ČSN EN 1507</span>
            <span className="hidden sm:inline text-slate-800">•</span>
            <span className="text-cyan-400 font-medium">Patrik Smialek (SUPERADMIN)</span>
          </div>

          {/* Sync Status & Backend Fetch Time Indicator with Accessible Popover Tooltip */}
          <div className="relative group">
            <div
              id="footer-sync-status-indicator"
              tabIndex={0}
              role="status"
              aria-live="polite"
              aria-describedby="footer-sync-tooltip"
              title={
                lastSyncTime
                  ? `Poslední úspěšná synchronizace dat: ${lastSyncTime.toLocaleDateString('cs-CZ', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })} v ${lastSyncTime.toLocaleTimeString('cs-CZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })} (${isOnline ? 'Online' : 'Offline'})`
                  : 'Probíhá první synchronizace s backend serverem...'
              }
              className="flex items-center gap-2.5 bg-slate-900/95 hover:bg-slate-850 focus:bg-slate-850 border border-slate-800 hover:border-slate-700 focus:border-cyan-500/60 rounded-full px-3.5 py-1.5 text-[11px] shadow-sm text-slate-300 transition-all duration-150 outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-default"
            >
              {/* Online / Offline Status Badge */}
              <div className="flex items-center gap-1.5">
                {isOnline ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">Online</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-semibold text-rose-400 uppercase tracking-wider text-[10px]">Offline</span>
                  </>
                )}
              </div>

              <span className="text-slate-700">|</span>

              {/* Last successful backend fetch timestamp */}
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>
                  Poslední synchronizace:{' '}
                  {lastSyncTime ? (
                    <time dateTime={lastSyncTime.toISOString()} className="text-slate-200 font-semibold">
                      {lastSyncTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </time>
                  ) : (
                    <span className="text-slate-500 italic">synchronizace...</span>
                  )}
                </span>
              </div>

              {/* Manual refresh button */}
              <button
                id="btn-footer-sync-refresh"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchData();
                }}
                disabled={isSyncing}
                title="Znovu synchronizovat data z backendu"
                aria-label="Obnovit synchronizaci dat z backendu"
                className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50 ml-0.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            {/* Custom Accessible Hover/Focus Popover Tooltip */}
            <div
              id="footer-sync-tooltip"
              role="tooltip"
              className="absolute bottom-full right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mb-2.5 w-72 p-3 bg-slate-900/98 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl shadow-black/80 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50 text-left"
            >
              {/* Tooltip Header / Connection State */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  Stav REST API backendu
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    isOnline ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                  }`}
                >
                  {isOnline ? 'Připojeno' : 'Odpojeno'}
                </span>
              </div>

              {/* Exact Date and Time Information */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-400 text-[10px]">Datum synchronizace:</div>
                    <div className="text-slate-100 font-medium">
                      {lastSyncTime
                        ? lastSyncTime.toLocaleDateString('cs-CZ', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Dosud neproběhla'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-400 text-[10px]">Přesný čas načtení:</div>
                    <div className="text-slate-100 font-mono font-medium">
                      {lastSyncTime
                        ? `${lastSyncTime.toLocaleTimeString('cs-CZ', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })} (${lastSyncTime.toLocaleDateString('cs-CZ')})`
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Synchronized Services Info */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 leading-relaxed">
                Synchronizováno: Projekty, Docházka, Sklad, Zápisy, Faktury a Normy ČSN EN.
              </div>

              {/* Arrow Indicator */}
              <div className="absolute top-full right-6 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 -mt-px w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700/80"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
