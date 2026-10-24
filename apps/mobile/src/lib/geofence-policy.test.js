import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findProjectAtPosition,
  getAutoAttendanceProjects,
  hasProjectCoordinates,
  isWithinProjectShift,
  getGeolocationSchedule
} from './geofence-policy.js';

test('automatic attendance only includes active projects assigned to this user in AUTO or COMBINED mode', () => {
  const projects = [
    { id: 'one', status: 'ACTIVE', gpsMode: 'AUTO', lat: 50, lng: 14 },
    { id: 'two', status: 'ACTIVE', gpsMode: 'MANUAL', lat: 50, lng: 14 },
    { id: 'three', status: 'ARCHIVED', gpsMode: 'AUTO', lat: 50, lng: 14 },
    { id: 'four', status: 'ACTIVE', gpsMode: 'COMBINED', lat: 50, lng: 14 }
  ];
  const assignments = [
    { userId: 'u1', projectId: 'one' },
    { userId: 'u1', projectId: 'two' },
    { userId: 'u1', projectId: 'three' },
    { userId: 'u2', projectId: 'four' }
  ];

  assert.deepEqual(getAutoAttendanceProjects(projects, assignments, 'u1').map((p) => p.id), ['one']);
});

test('valid coordinates include zero and reject missing, NaN and out-of-range values', () => {
  assert.equal(hasProjectCoordinates({ lat: 0, lng: 0 }), true);
  assert.equal(hasProjectCoordinates({ lat: null, lng: 14 }), false);
  assert.equal(hasProjectCoordinates({ lat: 'x', lng: 14 }), false);
  assert.equal(hasProjectCoordinates({ lat: 91, lng: 14 }), false);
});

test('shift window is inclusive at start, exclusive at end, and supports overnight shifts', () => {
  const day = (hour, minute = 0) => new Date(2026, 0, 1, hour, minute);
  const standard = { shiftStart: '07:00', shiftEnd: '18:00' };
  assert.equal(isWithinProjectShift(standard, day(6, 59)), false);
  assert.equal(isWithinProjectShift(standard, day(7)), true);
  assert.equal(isWithinProjectShift(standard, day(17, 59)), true);
  assert.equal(isWithinProjectShift(standard, day(18)), false);

  const night = { shiftStart: '22:00', shiftEnd: '06:00' };
  assert.equal(isWithinProjectShift(night, day(23)), true);
  assert.equal(isWithinProjectShift(night, day(5, 59)), true);
  assert.equal(isWithinProjectShift(night, day(12)), false);
});

test('equal start and end produces an all-day native tracking schedule', () => {
  assert.deepEqual(getGeolocationSchedule([{ shiftStart: '07:00', shiftEnd: '07:00' }]), ['1-7 00:00-23:59']);
});

test('nearest project within its configured radius wins and coordinates at zero work', () => {
  const point = { lat: 0, lng: 0 };
  const projects = [
    { id: 'far', lat: 0, lng: 0.0005, radius: 100 },
    { id: 'near', lat: 0, lng: 0.0001, radius: 100 }
  ];
  assert.equal(findProjectAtPosition(point, projects).id, 'near');
  assert.equal(findProjectAtPosition(point, [{ lat: 1, lng: 1, radius: 10 }]), null);
});
