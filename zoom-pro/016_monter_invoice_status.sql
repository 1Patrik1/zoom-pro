-- Zoom Pro — doplnění stavů pro schvalování výkazů montérů (oprava migrace 012)
-- invoice_status_enum nemělo SUBMITTED/APPROVED → /monter-invoices/pending, /submit i /approve padaly na 500
BEGIN;
ALTER TYPE invoice_status_enum ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE invoice_status_enum ADD VALUE IF NOT EXISTS 'APPROVED';
COMMIT;
