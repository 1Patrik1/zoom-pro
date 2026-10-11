-- Výchozí bezpečné předvolby pro přípravný panel platební brány.
-- Neobsahuje přístupové údaje a neaktivuje zpracování plateb.
BEGIN;

INSERT INTO "PlatformSetting"("key", value, description)
VALUES (
  'paymentGateway',
  '{"provider":"UNSELECTED","environment":"TEST","currency":"CZK"}'::jsonb,
  'Předvolby budoucí platební brány; bez aktivního checkoutu a bez tajných klíčů'
)
ON CONFLICT ("key") DO NOTHING;

COMMIT;
