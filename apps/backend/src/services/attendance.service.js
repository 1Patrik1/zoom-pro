import { attendanceRepo } from '../repositories/attendance.repo.js';
import { HttpError } from '../utils/http-error.js';

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const attendanceService = {
  async create(user, payload) {
    let projectId = payload.projectId || null;
    if (user.role === 'MONTER' && payload.type !== 'ABSENCE') {
      const assignmentResult = await attendanceRepo.getUserAssignments(user.companyId, user.id);
      const assignments = assignmentResult.rows;
      if (projectId && !assignments.some((project) => project.id === projectId)) {
        throw new HttpError(403, 'Docházku lze zapsat pouze na přiřazený projekt');
      }
      if (!projectId) {
        const now = Date.now();
        const active = assignments.filter((project) => project.status === 'ACTIVE'
          && (!project.plannedStart || new Date(project.plannedStart).getTime() <= now)
          && (!project.plannedEnd || new Date(project.plannedEnd).getTime() >= now));
        const candidates = active.length ? active : assignments;
        if (candidates.length !== 1) {
          throw new HttpError(409, candidates.length
            ? 'Máte přiřazeno více projektů. Požádejte stavbyvedoucího o výběr aktuálního projektu.'
            : 'Nemáte přiřazený projekt. Požádejte stavbyvedoucího o jeho přiřazení.');
        }
        projectId = candidates[0].id;
      }
    }
    if (payload.type === 'ABSENCE') projectId = null;

    let distanceFromProjectM = null;
    let withinProjectRadius = null;
    let geoStatus = 'NO_PROJECT';
    let projectRadiusSnapshot = null;
    let projectAddressSnapshot = null;

    const lat = toNumber(payload.lat);
    const lng = toNumber(payload.lng);

    if (projectId) {
      const projectResult = await attendanceRepo.getProjectSnapshot(user.companyId, projectId);
      const project = projectResult.rows[0];
      if (!project) throw new HttpError(404, 'Projekt pro docházku nebyl nalezen');

      projectRadiusSnapshot = toNumber(project.radius) ?? 100;
      projectAddressSnapshot = project.address || null;

      if (lat === null || lng === null) {
        geoStatus = 'NO_GPS';
      } else if (project.lat === null || project.lng === null || project.lat === undefined || project.lng === undefined) {
        geoStatus = 'PROJECT_WITHOUT_GPS';
      } else {
        distanceFromProjectM = Number(haversineDistanceMeters(lat, lng, Number(project.lat), Number(project.lng)).toFixed(2));
        withinProjectRadius = distanceFromProjectM <= projectRadiusSnapshot;
        geoStatus = withinProjectRadius ? 'OK' : 'OUT_OF_RADIUS';
      }
    }

    const noteParts = [payload.note?.trim()].filter(Boolean);
    if (projectId && distanceFromProjectM !== null) noteParts.push(`Odchylka ${distanceFromProjectM} m`);

    const result = await attendanceRepo.create({
      userId: user.id,
      companyId: user.companyId,
      projectId,
      type: payload.type,
      status: payload.status,
      lat,
      lng,
      note: noteParts.join(' | ') || null,
      distanceFromProjectM,
      withinProjectRadius,
      geoStatus,
      projectRadiusSnapshot,
      projectAddressSnapshot
    });
    return result.rows[0];
  }
};
