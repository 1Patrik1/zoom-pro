-- =============================================================================
-- PWA-VZT-SYSTEM
-- 002_seed_permissions.sql
-- Seed oprávnění + default role permissions
-- =============================================================================

BEGIN;

WITH perms(key, module_key, label, description) AS (
  VALUES
    ('saas.read_all_companies', 'saas', 'Zobrazit všechny firmy', 'Přístup k přehledu všech tenantů v síti'),
    ('saas.manage_licenses', 'saas', 'Spravovat licence', 'Aktivace, blokace a úprava licencí tenantů'),

    ('attendance.read', 'attendance', 'Číst docházku', 'Zobrazit docházkové záznamy'),
    ('attendance.create', 'attendance', 'Vytvářet docházku', 'Zapisovat příchod, odchod a absence'),
    ('attendance.edit_own', 'attendance', 'Upravit vlastní docházku', 'Upravit vlastní záznamy docházky'),
    ('attendance.edit_all', 'attendance', 'Upravit cizí docházku', 'Upravit docházku všech uživatelů'),
    ('attendance.approve', 'attendance', 'Schválit docházku', 'Schvalovat změny a uzávěrky docházky'),
    ('attendance.export', 'attendance', 'Export docházky', 'Export docházkových sestav pro mzdy a audit'),
    ('attendance.sign', 'attendance', 'Podepsat docházku', 'Podepisovat docházkové výkazy a uzávěrky'),

    ('projects.read', 'projects', 'Číst projekty', 'Zobrazit seznam a detail projektů'),
    ('projects.create', 'projects', 'Vytvářet projekty', 'Zakládat nové projekty'),
    ('projects.edit', 'projects', 'Upravovat projekty', 'Měnit metadata projektu'),
    ('projects.archive', 'projects', 'Archivovat projekty', 'Ukončit a archivovat projekt'),
    ('projects.assign_team', 'projects', 'Přiřazovat tým', 'Přiřadit/odebrat pracovníky na projekt'),
    ('projects.manage_milestones', 'projects', 'Spravovat milníky', 'Editace milníků a harmonogramu'),
    ('projects.export', 'projects', 'Export projektů', 'Export dat a přehledů projektu'),

    ('chat.read', 'chat', 'Číst chat', 'Číst zprávy projektového chatu'),
    ('chat.send', 'chat', 'Posílat zprávy', 'Posílat zprávy do projektového chatu'),
    ('chat.edit', 'chat', 'Upravit zprávy', 'Upravovat vlastní/cizí zprávy dle logiky aplikace'),
    ('chat.delete', 'chat', 'Mazat zprávy', 'Mazat zprávy z projektového chatu'),
    ('chat.export', 'chat', 'Export chatu', 'Export konverzace do dokumentu'),

    ('daily_log.read', 'daily_log', 'Číst deník', 'Zobrazit zápisy stavebního deníku'),
    ('daily_log.create', 'daily_log', 'Vytvářet deník', 'Zakládat nové denní zápisy'),
    ('daily_log.edit_own', 'daily_log', 'Upravit vlastní zápis', 'Upravit vlastní zápis deníku'),
    ('daily_log.edit_all', 'daily_log', 'Upravit cizí zápis', 'Upravit zápisy všech uživatelů'),
    ('daily_log.lock', 'daily_log', 'Uzamknout deník', 'Uzamknout zápis/deník po schválení'),
    ('daily_log.approve', 'daily_log', 'Schválit deník', 'Schválit denní zápis nebo uzávěrku'),
    ('daily_log.export', 'daily_log', 'Export deníku', 'Export stavebního deníku do PDF/DOCX'),
    ('daily_log.sign', 'daily_log', 'Podepsat deník', 'Podepisovat denní zápisy a deníkové reporty'),

    ('vzt.read', 'vzt_calculator', 'Číst VZT kalkulace', 'Zobrazit VZT komponenty a kalkulace'),
    ('vzt.create', 'vzt_calculator', 'Vytvářet VZT kalkulace', 'Zakládat nové VZT komponenty'),
    ('vzt.edit', 'vzt_calculator', 'Upravovat VZT kalkulace', 'Upravit parametry a výsledky kalkulace'),
    ('vzt.export', 'vzt_calculator', 'Export VZT kalkulace', 'Export kalkulačního listu a kusovníku'),
    ('vzt.manage_pricing', 'vzt_calculator', 'Spravovat ceník VZT', 'Měnit koeficienty a ceny výroby/prodeje'),

    ('invoices.read', 'invoices', 'Číst faktury', 'Zobrazit faktury a jejich stav'),
    ('invoices.create', 'invoices', 'Vytvářet faktury', 'Zakládat nové faktury'),
    ('invoices.edit', 'invoices', 'Upravovat faktury', 'Měnit draft a metadata faktur'),
    ('invoices.issue', 'invoices', 'Vystavit faktury', 'Přepnout fakturu do stavu issued'),
    ('invoices.mark_paid', 'invoices', 'Označit jako zaplaceno', 'Potvrdit úhradu faktury'),
    ('invoices.export', 'invoices', 'Export faktur', 'Export PDF, ISDOC, XML a seznamů'),
    ('invoices.approve', 'invoices', 'Schválit faktury', 'Schválit vystavení faktury'),
    ('invoices.sign', 'invoices', 'Podepsat faktury', 'Podepsat nebo opečetit faktury'),

    ('inventory.read', 'inventory', 'Číst sklad', 'Zobrazit stav skladu a položky'),
    ('inventory.create_item', 'inventory', 'Zakládat položky', 'Zakládat nové skladové položky'),
    ('inventory.edit_item', 'inventory', 'Upravit položky', 'Upravit karty skladových položek'),
    ('inventory.create_movement', 'inventory', 'Provádět pohyby skladu', 'Příjem, výdej, převod a inventurní úpravy'),
    ('inventory.audit', 'inventory', 'Provádět inventuru', 'Spustit a uzavřít inventuru'),
    ('inventory.export', 'inventory', 'Export skladu', 'Export sestav skladu a pohybů'),
    ('inventory.sign', 'inventory', 'Podepsat skladové doklady', 'Podepisovat výdejky, příjemky a inventury'),

    ('team.read', 'team', 'Číst tým', 'Zobrazit seznam uživatelů a jejich role'),
    ('team.invite', 'team', 'Pozvat uživatele', 'Založit nový účet nebo pozvánku'),
    ('team.approve', 'team', 'Schválit uživatele', 'Schválit čekající registrace'),
    ('team.edit_roles', 'team', 'Měnit role', 'Přidělovat a měnit role uživatelů'),
    ('team.manage_permissions', 'team', 'Spravovat oprávnění', 'Přepisovat granular permissions'),
    ('team.export', 'team', 'Export týmu', 'Export uživatelů a organizační struktury'),

    ('reports.read', 'reports', 'Číst reporty', 'Zobrazit dashboardy a analytické reporty'),
    ('reports.export', 'reports', 'Export reportů', 'Exportovat reporty do PDF/XLSX/CSV'),
    ('reports.schedule', 'reports', 'Plánovat reporty', 'Zakládat periodické generování reportů'),

    ('documents.read', 'documents', 'Číst dokumenty', 'Zobrazit dokumenty a jejich historii'),
    ('documents.create', 'documents', 'Vytvářet dokumenty', 'Zakládat nové dokumenty z šablon'),
    ('documents.edit', 'documents', 'Upravovat dokumenty', 'Upravit drafty dokumentů'),
    ('documents.delete', 'documents', 'Mazat dokumenty', 'Mazat neuzavřené dokumenty'),
    ('documents.approve', 'documents', 'Schválit dokumenty', 'Schválit workflow dokumentů'),
    ('documents.export', 'documents', 'Export dokumentů', 'Generovat a stahovat exporty dokumentů'),
    ('documents.sign', 'documents', 'Podepisovat dokumenty', 'Odeslat dokument do podpisu nebo podepsat'),
    ('documents.template_manage', 'documents', 'Spravovat šablony', 'Vytvářet a měnit šablony dokumentů'),

    ('imports.preview', 'imports', 'Preview importu', 'Spustit parsování a validaci bez zápisu'),
    ('imports.execute', 'imports', 'Provést import', 'Provést reálný import dat'),
    ('imports.manage_profiles', 'imports', 'Spravovat import profily', 'Vytvářet a měnit profily importu'),
    ('imports.read_history', 'imports', 'Číst historii importů', 'Zobrazit běhy importních úloh a jejich reporty'),

    ('exports.execute', 'exports', 'Provést export', 'Generovat exportní soubory'),
    ('exports.manage_profiles', 'exports', 'Spravovat export profily', 'Vytvářet a měnit profily exportu'),
    ('exports.read_history', 'exports', 'Číst historii exportů', 'Zobrazit historii exportních úloh'),

    ('signatures.request', 'signatures', 'Vytvářet podpisové požadavky', 'Zakládat signing requesty'),
    ('signatures.manage_providers', 'signatures', 'Spravovat podpisové providery', 'Měnit integrace a certifikáty'),
    ('signatures.validate', 'signatures', 'Validovat podpisy', 'Ověřovat stav podpisu, certifikát a timestamp'),

    ('settings.manage_company', 'settings', 'Spravovat firmu', 'Měnit firemní profil a identitu'),
    ('settings.manage_modules', 'settings', 'Spravovat moduly', 'Měnit detailní konfiguraci jednotlivých modulů'),
    ('settings.manage_security', 'settings', 'Spravovat bezpečnost', 'Měnit bezpečnostní politiku a 2FA'),
    ('settings.manage_branding', 'settings', 'Spravovat branding', 'Měnit logo, barvy a branding dokumentů')
)
INSERT INTO "Permission" (id, key, "moduleKey", label, description, "createdAt")
SELECT gen_random_uuid(), key, module_key, label, description, NOW()
FROM perms
ON CONFLICT (key) DO NOTHING;

-- SUPERADMIN: vše
INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'SUPERADMIN', p.id, TRUE
FROM "Permission" p
ON CONFLICT (role, "permissionId") DO NOTHING;

-- REDITEL: vše v rámci firmy kromě tenant-wide SaaS přehledu a licencí
INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'REDITEL', p.id, TRUE
FROM "Permission" p
WHERE p.key NOT IN ('saas.read_all_companies', 'saas.manage_licenses')
ON CONFLICT (role, "permissionId") DO NOTHING;

-- ADMINISTRACE
INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'ADMINISTRACE', p.id, TRUE
FROM "Permission" p
WHERE p.key = ANY (ARRAY[
  'attendance.read',
  'attendance.export',
  'invoices.read',
  'invoices.create',
  'invoices.edit',
  'invoices.issue',
  'invoices.mark_paid',
  'invoices.export',
  'team.read',
  'team.approve',
  'team.export',
  'reports.read',
  'reports.export',
  'documents.read',
  'documents.create',
  'documents.edit',
  'documents.export',
  'documents.template_manage',
  'imports.preview',
  'imports.execute',
  'imports.read_history',
  'exports.execute',
  'exports.read_history',
  'settings.manage_company',
  'settings.manage_branding'
])
ON CONFLICT (role, "permissionId") DO NOTHING;

-- VEDOUCI
INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'VEDOUCI', p.id, TRUE
FROM "Permission" p
WHERE p.key = ANY (ARRAY[
  'attendance.read',
  'attendance.create',
  'attendance.edit_own',
  'attendance.edit_all',
  'attendance.approve',
  'attendance.export',
  'projects.read',
  'projects.create',
  'projects.edit',
  'projects.assign_team',
  'projects.export',
  'chat.read',
  'chat.send',
  'chat.export',
  'daily_log.read',
  'daily_log.create',
  'daily_log.edit_own',
  'daily_log.edit_all',
  'daily_log.lock',
  'daily_log.approve',
  'daily_log.export',
  'vzt.read',
  'vzt.create',
  'vzt.edit',
  'vzt.export',
  'inventory.read',
  'inventory.create_movement',
  'inventory.export',
  'team.read',
  'reports.read',
  'reports.export',
  'documents.read',
  'documents.create',
  'documents.edit',
  'documents.approve',
  'documents.export',
  'imports.preview',
  'imports.read_history',
  'exports.execute',
  'exports.read_history'
])
ON CONFLICT (role, "permissionId") DO NOTHING;

-- MONTER
INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'MONTER', p.id, TRUE
FROM "Permission" p
WHERE p.key = ANY (ARRAY[
  'attendance.read',
  'attendance.create',
  'attendance.edit_own',
  'projects.read',
  'chat.read',
  'chat.send',
  'daily_log.read',
  'daily_log.create',
  'daily_log.edit_own',
  'vzt.read',
  'vzt.create',
  'vzt.export',
  'inventory.read',
  'documents.read'
])
ON CONFLICT (role, "permissionId") DO NOTHING;

COMMIT;
