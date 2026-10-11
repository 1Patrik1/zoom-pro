import { syncRepo } from '../repositories/sync.repo.js';
import QRCode from 'qrcode';

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 2 }).format(n(value));
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function placeQrSvg(svg, x, y, size) {
  return svg
    .replace(/^<\?xml[^>]*>\s*/i, '')
    .replace(/<svg\b([^>]*)>/i, (_match, attributes) => {
      const withoutDimensions = attributes.replace(/\s(?:x|y|width|height)=["'][^"']*["']/gi, '');
      return `<svg${withoutDimensions} x="${x}" y="${y}" width="${size}" height="${size}">`;
    });
}

function buildLayoutXml(items, { title, subtitle, columns, company, footer, signatureLines = true }) {
  const width = 595;
  const rowHeight = 22;
  const headerHeight = 130;
  const footerHeight = signatureLines ? 130 : 80;
  const height = headerHeight + 32 + items.length * rowHeight + footerHeight;

  const header = `
    <text x="40" y="40" font-family="Helvetica" font-size="20" font-weight="bold">${escapeXml(company?.name || 'Zoom Pro')}</text>
    <text x="40" y="60" font-family="Helvetica" font-size="11">${escapeXml(company?.address || '')}</text>
    <text x="40" y="80" font-family="Helvetica" font-size="11">IČO: ${escapeXml(company?.ico || '—')} · DIČ: ${escapeXml(company?.dic || '—')}</text>
    <text x="40" y="110" font-family="Helvetica" font-size="18" font-weight="bold">${escapeXml(title)}</text>
    <text x="40" y="128" font-family="Helvetica" font-size="11">${escapeXml(subtitle)}</text>
    <line x1="40" y1="140" x2="${width - 40}" y2="140" stroke="#444" stroke-width="1"/>
  `;

  const colWidth = (width - 80) / columns.length;
  let headerRow = '';
  columns.forEach((col, idx) => {
    headerRow += `<text x="${40 + idx * colWidth}" y="160" font-family="Helvetica" font-size="10" font-weight="bold">${escapeXml(col.title)}</text>`;
  });

  const dataRows = items.map((item, idx) => {
    const y = 180 + idx * rowHeight;
    const bg = idx % 2 === 0 ? '<rect x="40" y="' + (y - 14) + '" width="' + (width - 80) + '" height="' + rowHeight + '" fill="#F3F4F6"/>' : '';
    let text = '';
    columns.forEach((col, cidx) => {
      text += `<text x="${40 + cidx * colWidth}" y="${y}" font-family="Helvetica" font-size="10">${escapeXml(item[col.key] ?? '')}</text>`;
    });
    return bg + text;
  }).join('\n');

  const footY = height - footerHeight + 30;
  const footerBlock = signatureLines
    ? `
      <line x1="40" y1="${footY}" x2="${width - 40}" y2="${footY}" stroke="#444" stroke-width="1"/>
      <text x="40" y="${footY + 18}" font-family="Helvetica" font-size="10">Za dodavatele: ___________________________</text>
      <text x="320" y="${footY + 18}" font-family="Helvetica" font-size="10">Za odběratele: ___________________________</text>
    `
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${header}
  ${headerRow}
  ${dataRows}
  ${footerBlock}
  <text x="40" y="${height - 14}" font-family="Helvetica" font-size="9">${escapeXml(footer)}</text>
</svg>`;
}

export const printService = {
  async issueDocument(user, payload) {
    const cid = user.companyId;
    const [items, movements, company] = await Promise.all([
      syncRepo.getInventoryItems(cid),
      syncRepo.getInventoryMovements(cid),
      syncRepo.getCompany(cid)
    ]);

    const itemMap = new Map(items.rows.map((item) => [item.id, item]));
    const list = (movements.rows || []).filter((row) => ['ISSUE', 'TRANSFER', 'WRITE_OFF'].includes(row.type) && row.createdBy === user.id)
      .slice(0, 50)
      .map((row) => {
        const item = itemMap.get(row.itemId);
        return {
          when: new Date(row.createdAt).toLocaleString('cs-CZ'),
          name: row.itemName || item?.name || '—',
          code: row.itemCode || item?.code || '',
          type: row.type,
          quantity: n(row.quantity).toFixed(2),
          project: row.projectName || '—',
          ref: row.documentRef || ''
        };
      });

    if (payload?.itemId) {
      const found = items.rows.find((item) => item.id === payload.itemId);
      if (found) list.unshift({
        when: new Date().toLocaleString('cs-CZ'),
        name: found.name,
        code: found.code || '',
        type: 'INFO',
        quantity: n(found.quantity).toFixed(2),
        project: 'Aktuální stav',
        ref: payload.documentRef || ''
      });
    }

    const total = list.reduce((sum, r) => sum + Math.abs(n(r.quantity)), 0);
    const svg = buildLayoutXml(list, {
      title: 'Výdejka materiálu',
      subtitle: `${user.email} · ${new Date().toLocaleString('cs-CZ')} · celkem položek: ${list.length}`,
      columns: [
        { title: 'Datum', key: 'when' },
        { title: 'Položka / kód', key: 'name' },
        { title: 'Typ', key: 'type' },
        { title: 'Množství', key: 'quantity' },
        { title: 'Projekt', key: 'project' },
        { title: 'Doklad', key: 'ref' }
      ],
      company: company.rows[0] || {},
      footer: `Součet odchozích pohybů: ${total.toFixed(2)} ks · tisk PWA-VZT`,
      signatureLines: true
    });

    return {
      format: 'svg',
      title: 'Výdejka materiálu',
      filename: `vydejka-${user.id.slice(0, 6)}-${Date.now()}.svg`,
      payload: svg,
      rows: list.length,
      totalQuantity: total
    };
  },

  async receiptDocument(user, payload) {
    const cid = user.companyId;
    const [items, movements, company] = await Promise.all([
      syncRepo.getInventoryItems(cid),
      syncRepo.getInventoryMovements(cid),
      syncRepo.getCompany(cid)
    ]);
    const itemMap = new Map(items.rows.map((item) => [item.id, item]));
    const list = (movements.rows || []).filter((row) => ['RECEIPT', 'RETURN'].includes(row.type))
      .slice(0, 50)
      .map((row) => ({
        when: new Date(row.createdAt).toLocaleString('cs-CZ'),
        name: row.itemName || itemMap.get(row.itemId)?.name || '—',
        code: row.itemCode || itemMap.get(row.itemId)?.code || '',
        type: row.type,
        quantity: n(row.quantity).toFixed(2),
        supplier: row.authorName || '—',
        ref: row.documentRef || ''
      }));

    if (payload?.itemId) {
      const found = items.rows.find((item) => item.id === payload.itemId);
      if (found) list.unshift({
        when: new Date().toLocaleString('cs-CZ'),
        name: found.name,
        code: found.code || '',
        type: 'STAV',
        quantity: n(found.quantity).toFixed(2),
        supplier: found.location || '—',
        ref: payload.documentRef || ''
      });
    }

    const total = list.reduce((sum, r) => sum + Math.abs(n(r.quantity)), 0);
    const svg = buildLayoutXml(list, {
      title: 'Příjemka materiálu',
      subtitle: `Příjem z dodavatelů · ${new Date().toLocaleString('cs-CZ')}`,
      columns: [
        { title: 'Datum', key: 'when' },
        { title: 'Položka / kód', key: 'name' },
        { title: 'Typ', key: 'type' },
        { title: 'Množství', key: 'quantity' },
        { title: 'Dodavatel', key: 'supplier' },
        { title: 'Doklad', key: 'ref' }
      ],
      company: company.rows[0] || {},
      footer: `Celkem přijato: ${total.toFixed(2)} ks · tisk PWA-VZT`,
      signatureLines: true
    });

    return {
      format: 'svg',
      title: 'Příjemka materiálu',
      filename: `prijemka-${Date.now()}.svg`,
      payload: svg,
      rows: list.length,
      totalQuantity: total
    };
  },

  async inventoryAuditDocument(user) {
    const cid = user.companyId;
    const [items, movements, company] = await Promise.all([
      syncRepo.getInventoryItems(cid),
      syncRepo.getInventoryMovements(cid),
      syncRepo.getCompany(cid)
    ]);

    const itemsList = items.rows.map((item) => {
      const lastMovements = (movements.rows || []).filter((row) => row.itemId === item.id).slice(0, 5);
      const last = lastMovements[0];
      return {
        name: item.name,
        code: item.code || '',
        category: item.category || '',
        location: item.location || '',
        quantity: `${n(item.quantity).toFixed(2)} ${item.unit || 'ks'}`,
        minimum: `${n(item.minQuantity).toFixed(2)} ${item.unit || 'ks'}`,
        purchase: formatCurrency(item.purchasePrice),
        lastMovement: last ? `${new Date(last.createdAt).toLocaleDateString('cs-CZ')} (${last.type})` : '—'
      };
    });

    const svg = buildLayoutXml(itemsList, {
      title: 'Inventurní protokol',
      subtitle: `Audit skladu · ${itemsList.length} položek · ${new Date().toLocaleString('cs-CZ')}`,
      columns: [
        { title: 'Položka / kód', key: 'name' },
        { title: 'Kategorie', key: 'category' },
        { title: 'Lokace', key: 'location' },
        { title: 'Stav', key: 'quantity' },
        { title: 'Minimum', key: 'minimum' },
        { title: 'Nákupní cena', key: 'purchase' },
        { title: 'Poslední pohyb', key: 'lastMovement' }
      ],
      company: company.rows[0] || {},
      footer: 'Inventurní protokol PWA-VZT',
      signatureLines: true
    });

    return {
      format: 'svg',
      title: 'Inventurní protokol',
      filename: `inventura-${Date.now()}.svg`,
      payload: svg,
      rows: itemsList.length
    };
  },

  async projectZoneLabel(user, projectId) {
    const cid = user.companyId;
    const [projects, company] = await Promise.all([
      syncRepo.getProjects(cid),
      syncRepo.getCompany(cid)
    ]);
    const project = projects.rows.find((item) => item.id === projectId);
    if (!project) return null;

    const hasCoordinates = project.lat !== null && project.lat !== undefined && project.lng !== null && project.lng !== undefined
      && Number.isFinite(Number(project.lat)) && Number.isFinite(Number(project.lng));

    const zonePayload = {
      kind: 'ZONE',
      projectId: project.id,
      company: { id: company.rows[0]?.id, name: company.rows[0]?.name || '' },
      title: project.name,
      code: project.code || '',
      address: project.address || '',
      gps: hasCoordinates ? `${Number(project.lat).toFixed(5)}, ${Number(project.lng).toFixed(5)}` : '',
      tolerance: `${project.radius || 100} m`
    };
    const mapQuery = hasCoordinates ? zonePayload.gps : (project.address || project.name);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
    const qrSvg = await QRCode.toString(mapUrl, {
      type: 'svg', errorCorrectionLevel: 'M', margin: 2, width: 240,
      color: { dark: '#0f172a', light: '#ffffff' }
    });
    const gps = hasCoordinates ? `<text x="24" y="116" font-family="Helvetica" font-size="11">GPS: ${escapeXml(zonePayload.gps)}</text>` : '';
    const qr = placeQrSvg(qrSvg, 24, 132, 220);
    const payload = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="280" height="390" viewBox="0 0 280 390">
  <rect width="100%" height="100%" fill="#fff"/>
  <text x="24" y="32" font-family="Helvetica" font-size="18" font-weight="bold">${escapeXml(project.name)}</text>
  <text x="24" y="56" font-family="Helvetica" font-size="12">${escapeXml(project.address || 'Adresa projektu není zadána')}</text>
  <text x="24" y="78" font-family="Helvetica" font-size="11">Kód: ${escapeXml(project.code || '—')}</text>
  ${gps}
  ${qr}
</svg>`;

    return {
      format: 'svg',
      title: `QR zóna – ${project.name}`,
      filename: `qr-zone-${project.code || project.id.slice(0, 6)}.svg`,
      payload,
      payloadString: mapUrl,
      projectData: zonePayload
    };
  },

  async inventoryLabels(user, payload) {
    const cid = user.companyId;
    const items = (await syncRepo.getInventoryItems(cid)).rows || [];
    const codes = Array.isArray(payload?.codes) ? payload.codes : [];
    const codedItems = items.filter((item) => item.code);
    const selected = codes.length
      ? codedItems.filter((item) => codes.includes(item.code))
      : codedItems.slice(0, 12);

    const labelsSvg = await Promise.all(selected.map(async (item, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const x = col * 240;
      const y = row * 150;
      const qrSvg = await QRCode.toString(String(item.code), {
        type: 'svg', errorCorrectionLevel: 'M', margin: 1, width: 104,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      const qr = placeQrSvg(qrSvg, x + 122, y + 8, 106);
      return `
        <g>
          <rect x="${x}" y="${y}" width="240" height="150" fill="#ffffff" stroke="#222" stroke-width="1"/>
          <text x="${x + 12}" y="${y + 24}" font-family="Helvetica" font-size="12" font-weight="bold">${escapeXml(item.name)}</text>
          <text x="${x + 12}" y="${y + 46}" font-family="Helvetica" font-size="10">${escapeXml(item.code || '')}</text>
          <text x="${x + 12}" y="${y + 66}" font-family="Helvetica" font-size="9">${escapeXml(item.location || '')}</text>
          <text x="${x + 12}" y="${y + 84}" font-family="Helvetica" font-size="9">${escapeXml(item.category || '')}</text>
          ${qr}
        </g>`;
    })).then((labels) => labels.join('\n'));

    const width = 240 * 3;
    const height = 150 * Math.max(1, Math.ceil(selected.length / 3));
    const layoutSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  ${labelsSvg}
</svg>`;

    return {
      format: 'svg',
      title: 'QR štítky materiálu',
      filename: `qr-labels-${Date.now()}.svg`,
      payload: layoutSvg,
      rows: selected.length
    };
  }
};
