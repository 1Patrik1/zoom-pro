import { collisionsRepo } from '../repositories/collisions.repo.js';
import { syncRepo } from '../repositories/sync.repo.js';

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ymd(value) {
  if (!value) return null;
  try {
    return String(new Date(value).toISOString()).slice(0, 10);
  } catch {
    return null;
  }
}

function isoDay(value) {
  return ymd(value);
}

export const collisionsService = {
  async detectAndPersist(user) {
    const cid = user.companyId;
    const [projects, attendance, assignments, items, movements, invoices] = await Promise.all([
      syncRepo.getProjects(cid),
      syncRepo.getAttendance(cid),
      syncRepo.getAssignments(cid),
      syncRepo.getInventoryItems(cid),
      syncRepo.getInventoryMovements(cid),
      syncRepo.getInvoices(cid)
    ]);

    const projectRows = projects.rows;
    const attendanceRows = attendance.rows;
    const assignmentRows = assignments.rows;
    const itemRows = items.rows;
    const invoiceRows = invoices.rows;

    const alerts = [];

    // PERSON_OVERLAP_DAY – pracovník na více projektech v jeden den
    const userDay = new Map();
    for (const row of attendanceRows) {
      if (!row.userId || !row.projectId || !row.createdAt) continue;
      const day = isoDay(row.createdAt);
      if (!day) continue;
      const key = `${row.userId}:${day}`;
      if (!userDay.has(key)) userDay.set(key, new Map());
      const projectMap = userDay.get(key);
      if (!projectMap.has(row.projectId)) {
        projectMap.set(row.projectId, {
          userEmail: row.email,
          projects: new Set([row.projectId]),
          projectNames: new Set([row.projectName].filter(Boolean))
        });
      } else {
        projectMap.get(row.projectId).projectNames.add(row.projectName);
      }
      // remember raw assignment for current personDay across projects
      if (!userDay.has(`projects:${key}`)) userDay.set(`projects:${key}`, new Set([row.projectId]));
      else userDay.get(`projects:${key}`).add(row.projectId);
    }

    for (const [key, projectsSet] of userDay.entries()) {
      if (!key.startsWith('projects:')) continue;
      const dayKey = key.slice('projects:'.length);
      const projectIds = [...projectsSet];
      if (projectIds.length < 2) continue;

      const projectNames = projectIds.map((pid) => {
        const project = projectRows.find((p) => p.id === pid);
        return project ? project.name : pid;
      });
      const [userId, day] = dayKey.split(':');

      alerts.push({
        kind: 'PERSON_OVERLAP_DAY',
        severity: 'WARNING',
        projectId: null,
        userId,
        day,
        detail: {
          userEmail: userDay.get(`userEmail:${userId}:${day}`),
          projects: projectNames,
          message: `${userDay.get(`userEmail:${userId}:${day}`) || 'Pracovník'} byl v den ${day} přiřazen k projektům: ${projectNames.join(', ')}.`
        }
      });
    }

    // MATERIAL_RACE – na jednom projektu v jeden den odchází/vyšší množství než je na skladě
    const projectDayIssues = new Map();
    for (const movement of (await syncRepo.getInventoryMovements(cid)).rows) {
      if (!movement.projectId) continue;
      const day = isoDay(movement.createdAt);
      if (!day) continue;
      const item = itemRows.find((i) => i.id === movement.itemId);
      if (!item) continue;
      const delta = n(movement.quantity);
      const reduces = ['ISSUE', 'TRANSFER', 'WRITE_OFF'].includes(movement.type);
      if (!reduces) continue;
      const stockAfter = n(movement.quantityAfter);
      const minRequired = n(item.minQuantity);
      const key = `${movement.projectId}:${day}`;
      if (!projectDayIssues.has(key)) projectDayIssues.set(key, []);
      projectDayIssues.get(key).push({
        itemId: movement.itemId,
        itemName: movement.itemName || item.name,
        delta,
        stockAfter,
        minQuantity: minRequired
      });
    }
    for (const [key, list] of projectDayIssues.entries()) {
      const [projectId, day] = key.split(':');
      const bad = list.filter((l) => l.stockAfter < l.minQuantity);
      if (!bad.length) continue;
      const project = projectRows.find((p) => p.id === projectId);
      alerts.push({
        kind: 'MATERIAL_RACE',
        severity: 'CRITICAL',
        projectId,
        userId: null,
        itemId: bad[0].itemId,
        day,
        detail: {
          projectName: project ? project.name : projectId,
          items: bad.map((row) => ({ name: row.itemName, after: row.stockAfter, min: row.minQuantity })),
          message: `Materiál na projektu ${project ? project.name : ''} klesl pod minimum během dne ${day}.`
        }
      });
    }

    // BUDGET_OVERRUN – faktury za projekt překročily rozpočet
    for (const project of projectRows) {
      const budget = n(project.budget);
      if (budget <= 0) continue;
      const projectInvoices = invoiceRows.filter((i) => i.projectId === project.id);
      const totalInvoiced = projectInvoices.reduce((sum, i) => sum + n(i.total ?? i.amount), 0);
      if (totalInvoiced > budget) {
        alerts.push({
          kind: 'BUDGET_OVERRUN',
          severity: 'CRITICAL',
          projectId: project.id,
          userId: null,
          itemId: null,
          day: null,
          detail: {
            projectName: project.name,
            budget,
            totalInvoiced,
            overrun: Number((totalInvoiced - budget).toFixed(2)),
            message: `Projekt ${project.name} vyčerpal ${totalInvoiced} CZK z rozpočtu ${budget} CZK.`
          }
        });
      }
    }

    // SCHEDULE_OVERLAP – dva projekty mají překryv naplánovaného termínu
    for (let i = 0; i < projectRows.length; i++) {
      for (let j = i + 1; j < projectRows.length; j++) {
        const a = projectRows[i];
        const b = projectRows[j];
        const aStart = new Date(a.plannedStart || a.startDate || null);
        const aEnd = new Date(a.plannedEnd || a.endDate || null);
        const bStart = new Date(b.plannedStart || b.startDate || null);
        const bEnd = new Date(b.plannedEnd || b.endDate || null);
        if (!aStart || !bStart || Number.isNaN(aStart.getTime()) || Number.isNaN(bStart.getTime())) continue;
        const overlap = !(aEnd < bStart || bEnd < aStart);
        if (!overlap) continue;
        alerts.push({
          kind: 'SCHEDULE_OVERLAP',
          severity: 'INFO',
          projectId: a.id,
          userId: null,
          itemId: null,
          day: null,
          detail: {
            projects: [a.name, b.name],
            projectB: b.id,
            aStart: aStart.toISOString(),
            aEnd: aEnd.toISOString(),
            bStart: bStart.toISOString(),
            bEnd: bEnd.toISOString(),
            message: `Projekty ${a.name} a ${b.name} mají překryv plánovaného termínu.`
          }
        });
      }
    }

    // SKILL_MISMATCH – MONTER (role) je přiřazen na projekt s požadavkem VEDOUCI/ADMINISTRACE z pohledu inventární role
    for (const project of projectRows) {
      const required = (project.requiredRole || project.teamRoleRequired || '').toString().toUpperCase();
      if (!required) continue;
      const projectAssignments = assignmentRows.filter((a) => a.projectId === project.id);
      const knownUsers = await syncRepo.getUsers(cid);
      for (const ass of projectAssignments) {
        const user = knownUsers.rows.find((u) => u.id === ass.userId);
        if (!user) continue;
        if (user.role !== required && user.role !== 'SUPERADMIN' && user.role !== 'REDITEL') {
          alerts.push({
            kind: 'SKILL_MISMATCH',
            severity: 'WARNING',
            projectId: project.id,
            userId: ass.userId,
            itemId: null,
            day: null,
            detail: {
              projectName: project.name,
              userEmail: user.email,
              requiredRole: required,
              actualRole: user.role,
              message: `Pracovník ${user.email} (${user.role}) na projektu ${project.name} nesplňuje požadovanou roli ${required}.`
            }
          });
        }
      }
    }

    // uložíme do DB pouze nové alerty (bez ID), existující se neaktualizují
    const created = [];
    for (const alert of alerts.slice(0, 60)) {
      const result = await collisionsRepo.upsert({
        id: null,
        companyId: cid,
        kind: alert.kind,
        severity: alert.severity,
        status: 'OPEN',
        projectId: alert.projectId,
        userId: alert.userId,
        itemId: alert.itemId,
        day: alert.day,
        detail: alert.detail
      });
      if (result.rows[0]) created.push(result.rows[0]);
    }

    return {
      detected: alerts.length,
      persisted: created.length,
      byKind: alerts.reduce((acc, a) => {
        acc[a.kind] = (acc[a.kind] || 0) + 1;
        return acc;
      }, {}),
      recent: created.slice(0, 20)
    };
  },

  async list(user, { status = '' } = {}) {
    const result = await collisionsRepo.list(user.companyId, { status, limit: 200 });
    return result.rows;
  },

  async setStatus(user, collisionId, status) {
    const result = await collisionsRepo.setStatus(user.companyId, collisionId, status);
    if (!result.rows[0]) return { ok: false };
    return { ok: true, collision: result.rows[0] };
  }
};
