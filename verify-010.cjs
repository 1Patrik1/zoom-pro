const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://USER:CHANGE_ME@localhost:5432/DB_NAME?schema=public' });
  await c.connect();
  const tbl = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('CollisionAlert','ProjectTroubleshooting') ORDER BY table_name");
  console.log('new tables:', tbl.rows.map((r) => r.table_name).join(', '));
  const perms = await c.query("SELECT key FROM \"Permission\" WHERE key IN ('collisions.read','collisions.manage','projects.troubleshoot') ORDER BY key");
  console.log('new permissions:', perms.rows.map((r) => r.key).join(', '));
  const rp = await c.query("SELECT rp.role, p.key FROM \"RolePermission\" rp JOIN \"Permission\" p ON p.id = rp.\"permissionId\" WHERE p.key IN ('collisions.read','collisions.manage','projects.troubleshoot') ORDER BY rp.role, p.key");
  console.log('role permissions rows:', rp.rows.length);
  for (const row of rp.rows) console.log('  ', row.role, '->', row.key);
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
