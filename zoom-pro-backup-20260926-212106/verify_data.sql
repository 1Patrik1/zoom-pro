SELECT COUNT(*) as total_users FROM "User";
SELECT COUNT(*) as total_projects FROM "Project";
SELECT COUNT(*) as total_companies FROM "Company";
SELECT email, "firstName", "lastName", role FROM "User" ORDER BY email;
SELECT id, name, status FROM "Project";
