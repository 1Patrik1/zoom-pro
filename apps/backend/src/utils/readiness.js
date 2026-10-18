export async function checkDatabaseReadiness(runQuery) {
  try {
    await runQuery('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
