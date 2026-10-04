BEGIN;

-- Vytvoření demo uživatelů
INSERT INTO "User" (id, email, password, role, "isApproved", "companyId", "firstName", "lastName", phone, "employeeId", "twoFactorEnabled", "createdAt", "updatedAt")
VALUES
  ('11111111-1111-4000-8000-000000000001', 'reditel@platform.local', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'REDITEL', TRUE, '00000000-0000-4000-8000-000000000001', 'Petr', 'Řídící', '+420111111111', 'EMP001', FALSE, NOW(), NOW()),
  ('11111111-1111-4000-8000-000000000002', 'admin@platform.local', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'ADMINISTRACE', TRUE, '00000000-0000-4000-8000-000000000001', 'Anna', 'Správce', '+420111111112', 'EMP002', FALSE, NOW(), NOW()),
  ('11111111-1111-4000-8000-000000000003', 'vedouci@platform.local', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'VEDOUCI', TRUE, '00000000-0000-4000-8000-000000000001', 'Jan', 'Vedoucí', '+420111111113', 'EMP003', FALSE, NOW(), NOW()),
  ('11111111-1111-4000-8000-000000000004', 'monter1@platform.local', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'MONTER', TRUE, '00000000-0000-4000-8000-000000000001', 'Tomáš', 'Tesař', '+420111111114', 'EMP004', FALSE, NOW(), NOW()),
  ('11111111-1111-4000-8000-000000000005', 'monter2@platform.local', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'MONTER', TRUE, '00000000-0000-4000-8000-000000000001', 'Martin', 'Maliř', '+420111111115', 'EMP005', FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Vytvoření demo projektu
INSERT INTO "Project" (id, name, "companyId", status, "plannedStart", "plannedEnd", budget, address, "clientName", lat, lng, code, "createdAt", "updatedAt")
VALUES
  ('22222222-2222-4000-8000-000000000001', 'Obnova střechy budovy A', '00000000-0000-4000-8000-000000000001', 'ACTIVE', NOW(), NOW() + INTERVAL '30 days', 500000, 'Holešovice, Praha', 'ABC Stavby s.r.o.', 50.1234, 14.5678, 'PROJ-2026-001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Přiřazení uživatelů k projektu
INSERT INTO "ProjectAssignment" (id, "projectId", "userId", "companyId", role, "assignedAt")
VALUES
  ('33333333-3333-4000-8000-000000000001', '22222222-2222-4000-8000-000000000001', '11111111-1111-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'VEDOUCI_PROJEKTU', NOW()),
  ('33333333-3333-4000-8000-000000000002', '22222222-2222-4000-8000-000000000001', '11111111-1111-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'MONTER', NOW()),
  ('33333333-3333-4000-8000-000000000003', '22222222-2222-4000-8000-000000000001', '11111111-1111-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'MONTER', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
