const EARTH_RADIUS_M = 6371000;

export function parseShiftTime(value) {
  if (typeof value !== 'string' || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isWithinProjectShift(project, date = new Date()) {
  const start = parseShiftTime(project?.shiftStart || '07:00');
  const end = parseShiftTime(project?.shiftEnd || '18:00');
  if (start === null || end === null) return false;
  if (start === end) return true;

  const now = date.getHours() * 60 + date.getMinutes();
  return start < end ? now >= start && now < end : now >= start || now < end;
}

function coordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function hasProjectCoordinates(project) {
  const lat = coordinate(project?.lat);
  const lng = coordinate(project?.lng);
  return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function getAutoAttendanceProjects(projects = [], assignments = [], userId) {
  const assigned = new Set(assignments
    .filter((item) => String(item?.userId) === String(userId))
    .map((item) => String(item?.projectId)));
  return projects.filter((project) => (
    project?.id
    && assigned.has(String(project.id))
    && (project.status || 'ACTIVE') === 'ACTIVE'
    && ['AUTO', 'COMBINED', 'GPS_AUTO'].includes(project.gpsMode)
    && hasProjectCoordinates(project)
  ));
}

export function distanceMeters(point, project) {
  const lat1 = coordinate(point?.lat);
  const lng1 = coordinate(point?.lng);
  const lat2 = coordinate(project?.lat);
  const lng2 = coordinate(project?.lng);
  if ([lat1, lng1, lat2, lng2].some((value) => value === null)) return Infinity;

  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function findProjectAtPosition(point, projects = []) {
  return projects
    .map((project) => ({
      project,
      distance: distanceMeters(point, project),
      radius: Math.max(1, coordinate(project.radius) ?? 100)
    }))
    .filter((candidate) => candidate.distance <= candidate.radius)
    .sort((a, b) => a.distance - b.distance)[0]?.project || null;
}

export function getGeolocationSchedule(projects = []) {
  return [...new Set(projects.map((project) => {
    const start = project.shiftStart || '07:00';
    const end = project.shiftEnd || '18:00';
    return start === end ? '1-7 00:00-23:59' : '1-7 ' + start + '-' + end;
  }))];
}
