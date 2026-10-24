import BackgroundGeolocation from '@transistorsoft/capacitor-background-geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { api } from './api.js';
import { queue, store } from './storage.js';
import {
  findProjectAtPosition,
  getAutoAttendanceProjects,
  getGeolocationSchedule,
  isWithinProjectShift
} from './geofence-policy.js';

const GEOFENCE_PREFIX = 'zoom-project:';
let listenerHandles = [];
let projectsById = new Map();
let currentUserId = null;
let currentToken = null;
let activeSession = null;
let lastPosition = null;
let transitionQueue = Promise.resolve();
let running = false;

function toPoint(location) {
  const coords = location?.coords || location || {};
  const lat = Number(coords.latitude ?? coords.lat);
  const lng = Number(coords.longitude ?? coords.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, accuracy: Number(coords.accuracy) || null, timestamp: location?.timestamp || new Date().toISOString() };
}

function attendanceFromSync(attendance = [], userId) {
  const today = new Date().toLocaleDateString('sv-SE');
  const latest = attendance
    .filter((item) => String(item.userId) === String(userId)
      && new Date(item.createdAt || item.checkIn || 0).toLocaleDateString('sv-SE') === today)
    .sort((a, b) => new Date(b.createdAt || b.checkIn || 0) - new Date(a.createdAt || a.checkIn || 0))[0];
  if (latest?.type !== 'PRICHOD' || latest.status !== 'PRACE' || !latest.projectId) return null;
  return { projectId: String(latest.projectId), userId: String(userId), source: 'attendance-sync' };
}

async function notifyAttendance(project, type) {
  await LocalNotifications.schedule({
    notifications: [{
      id: Math.floor(Date.now() % 2147483647),
      title: type === 'PRICHOD' ? 'Příchod zaznamenán' : 'Odchod zaznamenán',
      body: project?.name || 'Docházka byla automaticky uložena.',
      extra: { projectId: project?.id, type }
    }]
  }).catch(() => {});
}

async function submitAttendance(project, type, point) {
  const body = {
    projectId: project.id,
    type,
    status: 'PRACE',
    lat: point?.lat,
    lng: point?.lng,
    note: 'geofence:auto'
  };
  try {
    return await api.requestOrQueue('/api/attendance', {
      method: 'POST',
      token: currentToken,
      body
    });
  } catch (error) {
    // Preserve a failed background transition for the authenticated user only.
    const user = await store.getUser();
    if (!user?.id || String(user.id) !== String(currentUserId)) throw error;
    await queue.push({
      path: '/api/attendance',
      opts: { method: 'POST', body },
      ownerUserId: String(user.id)
    });
    return { queued: true };
  }
}

async function closeSession(point) {
  if (!activeSession || String(activeSession.userId) !== String(currentUserId)) return;
  const project = projectsById.get(String(activeSession.projectId));
  if (project) {
    await submitAttendance(project, 'ODCHOD', point || lastPosition || {});
    await notifyAttendance(project, 'ODCHOD');
  }
  activeSession = null;
  await store.setGeofenceSession(null);
}

async function openSession(project, point) {
  if (activeSession?.projectId === String(project.id)) return;
  if (activeSession) await closeSession(point);
  await submitAttendance(project, 'PRICHOD', point);
  activeSession = { projectId: String(project.id), userId: String(currentUserId), source: 'geofence' };
  await store.setGeofenceSession(activeSession);
  await notifyAttendance(project, 'PRICHOD');
}

async function applyPosition(point, forcedAction = null, forcedProjectId = null) {
  if (!point || !currentUserId) return;
  lastPosition = point;
  const now = new Date(point.timestamp || Date.now());
  const forcedProject = forcedProjectId ? projectsById.get(String(forcedProjectId)) : null;

  if (forcedAction === 'EXIT') {
    if (activeSession?.projectId === String(forcedProjectId)) await closeSession(point);
    return;
  }
  if (forcedAction === 'ENTER') {
    if (forcedProject && isWithinProjectShift(forcedProject, now)) await openSession(forcedProject, point);
    return;
  }

  const hit = findProjectAtPosition(point, [...projectsById.values()]);
  if (hit && isWithinProjectShift(hit, now)) {
    await openSession(hit, point);
    return;
  }

  if (activeSession) {
    const sessionProject = projectsById.get(String(activeSession.projectId));
    const outside = !sessionProject || !findProjectAtPosition(point, [sessionProject]);
    const shiftEnded = sessionProject && !isWithinProjectShift(sessionProject, now);
    if (outside || shiftEnded) await closeSession(point);
  }
}

function enqueuePosition(point, action, projectId) {
  transitionQueue = transitionQueue
    .then(() => applyPosition(point, action, projectId))
    .catch((error) => console.warn('[geofence] Attendance transition failed:', error?.message || error));
  return transitionQueue;
}

function removeListeners() {
  for (const handle of listenerHandles) {
    try { handle.remove(); } catch {}
  }
  listenerHandles = [];
}

function pluginGeofences(projects) {
  return projects.map((project) => ({
    identifier: GEOFENCE_PREFIX + String(project.id),
    latitude: Number(project.lat),
    longitude: Number(project.lng),
    radius: Math.max(50, Number(project.radius) || 100),
    notifyOnEntry: true,
    notifyOnExit: true,
    notifyOnDwell: false,
    extras: { projectId: String(project.id) }
  }));
}

export async function startGeofence(projects, { assignments = [], attendance = [], user, token } = {}) {
  await stopGeofence({ disable: false });
  if (!user?.id || user.role !== 'MONTER') return { ok: false, reason: 'only-monter' };

  const eligible = getAutoAttendanceProjects(projects, assignments, user.id);
  if (!eligible.length) return { ok: false, reason: 'no-assigned-auto-projects' };

  currentUserId = String(user.id);
  currentToken = token || await store.getToken();
  projectsById = new Map(eligible.map((project) => [String(project.id), project]));
  activeSession = await store.getGeofenceSession();
  if (activeSession && String(activeSession.userId) !== currentUserId) activeSession = null;
  if (!activeSession) activeSession = attendanceFromSync(attendance, currentUserId);

  const geofences = pluginGeofences(eligible);
  if (geofences.length > 100) return { ok: false, reason: 'too-many-projects' };

  const config = {
    desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
    distanceFilter: 100,
    geofenceProximityRadius: 1000,
    locationAuthorizationRequest: 'Always',
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,
    debug: false,
    logLevel: BackgroundGeolocation.LOG_LEVEL_OFF,
    schedule: getGeolocationSchedule(eligible)
  };

  try {
    listenerHandles = [
      BackgroundGeolocation.onGeofence((event) => {
        const id = String(event?.identifier || '').replace(GEOFENCE_PREFIX, '');
        const project = projectsById.get(id);
        const action = String(event?.action || '').toUpperCase();
        if (!project || !['ENTER', 'EXIT'].includes(action)) return;
        enqueuePosition(toPoint(event.location), action, id);
      }),
      BackgroundGeolocation.onLocation((location) => {
        const point = toPoint(location);
        if (point) enqueuePosition(point);
      }),
      BackgroundGeolocation.onSchedule((event) => {
        if (event?.state?.enabled === false) {
          const point = lastPosition;
          enqueuePosition(point);
        } else if (event?.state?.enabled === true) {
          BackgroundGeolocation.getCurrentPosition({ timeout: 30, maximumAge: 30000, persist: false })
            .then((location) => enqueuePosition(toPoint(location)))
            .catch(() => {});
        }
      })
    ];

    await BackgroundGeolocation.ready(config);
    const permission = await BackgroundGeolocation.requestPermission();
    if (permission !== BackgroundGeolocation.AUTHORIZATION_STATUS_ALWAYS) {
      throw new Error('Povolte polohu „Vždy“ / „Povolit na pozadí“ pro automatickou docházku.');
    }

    await BackgroundGeolocation.removeGeofences();
    await BackgroundGeolocation.addGeofences(geofences);
    await BackgroundGeolocation.startGeofences();
    await BackgroundGeolocation.startSchedule();

    await store.setGpsAttendanceEnabled(true);
    await store.setGeofenceSession(activeSession);
    running = true;

    BackgroundGeolocation.getCurrentPosition({ timeout: 30, maximumAge: 30000, persist: false })
      .then((location) => enqueuePosition(toPoint(location)))
      .catch(() => {});
    return { ok: true, projectCount: eligible.length };
  } catch (error) {
    removeListeners();
    await BackgroundGeolocation.stopSchedule().catch(() => {});
    await BackgroundGeolocation.stop().catch(() => {});
    running = false;
    return { ok: false, reason: error?.message || 'gps-start-failed' };
  }
}

export async function stopGeofence({ disable = true } = {}) {
  removeListeners();
  await BackgroundGeolocation.stopSchedule().catch(() => {});
  await BackgroundGeolocation.stop().catch(() => {});
  running = false;
  projectsById = new Map();
  currentUserId = null;
  currentToken = null;
  lastPosition = null;
  if (disable) {
    activeSession = null;
    await store.setGpsAttendanceEnabled(false);
    await store.setGeofenceSession(null);
  }
}

export async function isGeofenceRunning() {
  try {
    const state = await BackgroundGeolocation.getState();
    running = Boolean(state?.enabled);
  } catch {
    running = false;
  }
  return running;
}

export const geofence = { start: startGeofence, stop: stopGeofence, isRunning: isGeofenceRunning };
