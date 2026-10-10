const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://vzt_user:vzt_pass@127.0.0.1:5432/vzt_system' });
  await c.connect();
  for (const t of ['Permission', 'RolePermission', 'UserPermissionOverride']) {
    const cols = await c.query(
      'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',
      ['public', t]
    );
    console.log(t + ':', cols.rows.map((r) => r.column_name + ' ' + r.data_type + (r.is_nullable === 'NO' ? ' NOT NULL' : '')).join(', '));
  }
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
