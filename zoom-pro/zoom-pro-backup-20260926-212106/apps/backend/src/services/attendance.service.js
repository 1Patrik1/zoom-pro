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
    let distanceFromProjectM = null;
    let withinProjectRadius = null;
    let geoStatus = 'NO_PROJECT';
    let projectRadiusSnapshot = null;
    let projectAddressSnapshot = null;

    const lat = toNumber(payload.lat);
    const lng = toNumber(payload.lng);

    if (payload.projectId) {
      const projectResult = await attendanceRepo.getProjectSnapshot(user.companyId, payload.projectId);
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
    if (payload.projectId && distanceFromProjectM !== null) noteParts.push(`Odchylka ${distanceFromProjectM} m`);

    const result = await attendanceRepo.create({
      userId: user.id,
      companyId: user.companyId,
      projectId: payload.projectId || null,
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
