SELECT COUNT(*) as total_users FROM "User";
SELECT COUNT(*) as total_projects FROM "Project";
SELECT COUNT(*) as total_companies FROM "Company";
SELECT id, email, firstname, role FROM "User" LIMIT 5;
