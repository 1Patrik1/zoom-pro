import { syncRepo } from '../repositories/sync.repo.js';

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uniquePush(list, entry, key = 'title') {
  if (!entry?.[key]) return;
  if (list.some((item) => item[key] === entry[key])) return;
  list.push(entry);
}

function uniqueTextPush(list, text) {
  if (!text) return;
  if (list.includes(text)) return;
  list.push(text);
}

function summarizeSeverity(findings) {
  if (findings.some((item) => item.severity === 'critical')) return 'kritické';
  if (findings.some((item) => item.severity === 'warning')) return 'varovné';
  return 'stabilní';
}

export const assistantService = {
  async analyze(user, payload) {
    const cid = user.companyId;
    const prompt = String(payload.prompt || '').trim();
    const normalizedPrompt = normalize(prompt);

    const [projects, attendance, logs, invoices, items, movements, assignments, users] = await Promise.all([
      syncRepo.getProjects(cid),
      syncRepo.getAttendance(cid),
      syncRepo.getLogs(cid),
      syncRepo.getInvoices(cid),
      syncRepo.getInventoryItems(cid),
      syncRepo.getInventoryMovements(cid),
      syncRepo.getAssignments(cid),
      syncRepo.getUsers(cid)
    ]);

    const projectRows = projects.rows;
    const attendanceRows = attendance.rows;
    const logRows = logs.rows;
    const invoiceRows = invoices.rows;
    const itemRows = items.rows;
    const movementRows = movements.rows;
    const assignmentRows = assignments.rows;
    const userRows = users.rows;

    const focusProject = payload.projectId ? projectRows.find((item) => item.id === payload.projectId) : null;
    const focusItem = payload.itemCode
      ? itemRows.find((item) => normalize(item.code) === normalize(payload.itemCode) || normalize(item.name) === normalize(payload.itemCode))
      : null;

    const findings = [];
    const recommendations = [];
    const quickActions = [];

    const lowStockItems = itemRows.filter((item) => n(item.quantity) <= n(item.minQuantity));
    const negativeStockItems = itemRows.filter((item) => n(item.quantity) < 0);
    const outOfRadiusAttendance = attendanceRows.filter((item) => item.geoStatus === 'OUT_OF_RADIUS');
    const noGpsAttendance = attendanceRows.filter((item) => item.geoStatus === 'NO_GPS');
    const unpaidInvoices = invoiceRows.filter((item) => item.status === 'ISSUED' || item.status === 'OVERDUE');
    const logsWithPhotos = logRows.filter((item) => Array.isArray(item.attachments) && item.attachments.length > 0);

    const multiProjectByUserDay = new Map();
    for (const row of attendanceRows) {
      if (!row.userId || !row.projectId || !row.createdAt) continue;
      const day = String(row.createdAt).slice(0, 10);
      const key = `${row.userId}:${day}`;
      if (!multiProjectByUserDay.has(key)) multiProjectByUserDay.set(key, new Set());
      multiProjectByUserDay.get(key).add(row.projectId);
    }
    const attendanceCollisions = [...multiProjectByUserDay.entries()].filter(([, projectIds]) => projectIds.size > 1);

    if (negativeStockItems.length) {
      uniquePush(findings, {
        severity: 'critical',
        type: 'inventory',
        title: 'Nesoulad skladu',
        detail: `${negativeStockItems.length} položek má záporný zůstatek. Doporučená okamžitá kontrola výdejek a příjemek.`
      });
      uniqueTextPush(recommendations, 'Provést inventuru problémových položek a porovnat QR výdeje s ručními pohyby.');
    }

    if (lowStockItems.length) {
      uniquePush(findings, {
        severity: 'warning',
        type: 'inventory',
        title: 'Nízký stav materiálu',
        detail: `${lowStockItems.length} položek je na minimálním nebo nižším stavu.`
      });
      uniqueTextPush(quickActions, 'Ve skladu otevřít QR čtečku a udělat rychlé naskladnění chybějících položek.');
    }

    if (outOfRadiusAttendance.length) {
      uniquePush(findings, {
        severity: 'warning',
        type: 'attendance',
        title: 'Docházka mimo stavbu',
        detail: `${outOfRadiusAttendance.length} posledních záznamů docházky bylo mimo definovaný rádius projektu.`
      });
    }

    if (attendanceCollisions.length) {
      uniquePush(findings, {
        severity: 'warning',
        type: 'collision',
        title: 'Možná kolize nasazení lidí',
        detail: `${attendanceCollisions.length} dnů obsahuje stejného pracovníka na více projektech.`
      });
      uniqueTextPush(recommendations, 'Zkontrolovat přiřazení pracovníků a denní logy u kolizních dnů.');
    }

    if (unpaidInvoices.length) {
      uniquePush(findings, {
        severity: 'info',
        type: 'finance',
        title: 'Neuzavřené faktury',
        detail: `${unpaidInvoices.length} faktur je stále ve stavu ISSUED nebo OVERDUE.`
      });
    }

    if (logsWithPhotos.length) {
      uniquePush(findings, {
        severity: 'info',
        type: 'quality',
        title: 'Fotodokumentace v deníku',
        detail: `${logsWithPhotos.length} denních záznamů už obsahuje fotodokumentaci, což pomáhá při řešení reklamací a kolizí.`
      });
    }

    if (focusProject) {
      const projectAttendanceOutside = outOfRadiusAttendance.filter((item) => item.projectId === focusProject.id).length;
      const projectAssignments = assignmentRows.filter((item) => item.projectId === focusProject.id).length;
      uniquePush(findings, {
        severity: projectAttendanceOutside ? 'warning' : 'info',
        type: 'project',
        title: `Fokus projektu: ${focusProject.name}`,
        detail: `Projekt má ${projectAssignments} přiřazení v týmu a ${projectAttendanceOutside} docházkových odchylek mimo rádius.`
      });
      uniqueTextPush(quickActions, `U projektu ${focusProject.name} projít chat, galerii a poslední denní záznamy.`);
    }

    if (focusItem) {
      const itemMovements = movementRows.filter((item) => item.itemId === focusItem.id).slice(0, 5);
      uniquePush(findings, {
        severity: n(focusItem.quantity) <= n(focusItem.minQuantity) ? 'warning' : 'info',
        type: 'inventory',
        title: `Fokus materiálu: ${focusItem.name}`,
        detail: `Aktuální stav ${n(focusItem.quantity)} ${focusItem.unit}. Posledních pohybů: ${itemMovements.length}.` 
      });
      uniqueTextPush(recommendations, 'Při výdeji materiálu používat QR kód a vazbu na projekt kvůli dohledatelnosti.');
    }

    if (includesAny(normalizedPrompt, ['qr', 'kod', 'material', 'sklad'])) {
      uniqueTextPush(recommendations, 'Naskladnění i výdej řešit přes QR sken a ukládat referenci dokladu nebo poznámku.');
      uniqueTextPush(quickActions, 'Ve skladu načíst QR kód materiálu a provést ISSUE / RECEIPT pohyb.');
    }

    if (includesAny(normalizedPrompt, ['koliz', 'stret', 'konflikt'])) {
      uniqueTextPush(recommendations, 'Porovnat docházku, denní logy a skladové výdeje ve stejném dni a projektu.');
      if (!attendanceCollisions.length) {
        uniquePush(findings, {
          severity: 'info',
          type: 'collision',
          title: 'Přímá personální kolize nenalezena',
          detail: 'V posledních synchronizovaných datech se neukázal zjevný konflikt stejného pracovníka na více projektech během jednoho dne.'
        });
      }
    }

    if (includesAny(normalizedPrompt, ['problem', 'chyb', 'nefung', 'porucha'])) {
      if (noGpsAttendance.length) {
        uniqueTextPush(recommendations, 'Ověřit povolení GPS v prohlížeči a případně doplnit adresu + GPS projektu ručně.');
      }
      uniqueTextPush(recommendations, 'Použít denní log s fotkou a popisem problému, aby byl dohledatelný postup řešení.');
    }

    const summary = `AI asistent vyhodnotil stav jako ${summarizeSeverity(findings)}. Našel ${findings.length} relevantních bodů nad daty firmy ${user.companyId}.`;

    return {
      summary,
      focus: {
        project: focusProject ? { id: focusProject.id, name: focusProject.name } : null,
        item: focusItem ? { id: focusItem.id, name: focusItem.name, code: focusItem.code } : null
      },
      findings: findings.slice(0, 8),
      recommendations: recommendations.slice(0, 8).map((text, index) => ({ id: `rec-${index + 1}`, text })),
      quickActions: quickActions.slice(0, 6).map((text, index) => ({ id: `qa-${index + 1}`, text })),
      metrics: {
        lowStockItems: lowStockItems.length,
        outOfRadiusAttendance: outOfRadiusAttendance.length,
        unpaidInvoices: unpaidInvoices.length,
        attendanceCollisions: attendanceCollisions.length,
        logsWithPhotos: logsWithPhotos.length,
        totalItems: itemRows.length,
        totalProjects: projectRows.length,
        totalUsers: userRows.length
      }
    };
  }
};
