'use strict';

const request = require('supertest');
const { DateTime } = require('luxon');
const app = require('../src/app');
const db = require('../src/models');

const TZ = 'Asia/Tokyo'; // UTC+9: clinic-local mornings fall on the previous UTC day
let adminToken;
let userToken;
let userId;
let doctorId;
let localDate; // clinic-local YYYY-MM-DD one week ahead
let slotsUrl;

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const at = (hhmm) => DateTime.fromISO(`${localDate}T${hhmm}`, { zone: TZ });

async function registerUser(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'secret123' });
  return res.body.data;
}

beforeAll(async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ADMIN@clinic.com', password: 'Admin@123' });
  expect(login.status).toBe(200);
  adminToken = login.body.data.token;

  const user = await registerUser('patient@example.com');
  userToken = user.token;
  userId = user.user.id;

  localDate = DateTime.now().setZone(TZ).plus({ days: 7 }).toISODate();
});

afterAll(() => db.sequelize.close());

describe('health & docs', () => {
  test('health checks the database', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBe('up');
  });

  test('swagger UI and OpenAPI JSON are served', async () => {
    const json = await request(app).get('/api-docs.json');
    expect(json.status).toBe(200);
    expect(json.body.openapi).toBe('3.0.3');
    expect(json.body.paths['/api/appointments'].post).toBeDefined();
    const ui = await request(app).get('/api-docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });
});

describe('auth', () => {
  test('rejects weak passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'weak@example.com', password: 'abc' });
    expect(res.status).toBe(422);
  });

  test('email uniqueness is case-insensitive', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'PATIENT@example.com', password: 'secret123' });
    expect(res.status).toBe(409);
  });

  test('public registration cannot self-assign ADMIN', async () => {
    const data = await registerUser('sneaky@example.com');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'S', email: 'sneaky2@example.com', password: 'secret123', role: 'ADMIN' });
    expect(data.user.role).toBe('USER');
    expect(res.body.data.user.role).toBe('USER');
  });

  test('wrong password -> 401, response never contains password hash', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email: 'patient@example.com', password: 'nope1234' });
    expect(bad.status).toBe(401);
    const me = await request(app).get('/api/auth/me').set(auth(userToken));
    expect(me.status).toBe(200);
    expect(me.body.data.user.password).toBeUndefined();
  });

  test('tampered / missing token -> 401', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth(`${userToken}x`))).status).toBe(401);
  });
});

describe('authorization', () => {
  test('USER cannot access admin routes', async () => {
    const res = await request(app).get('/api/admin/doctors').set(auth(userToken));
    expect(res.status).toBe(403);
  });
});

describe('admin setup', () => {
  test('rejects invalid timezone, accepts IANA timezone', async () => {
    const bad = await request(app).put('/api/admin/clinic-settings').set(auth(adminToken)).send({ timezone: 'Mars/Base' });
    expect(bad.status).toBe(400);
    const ok = await request(app).put('/api/admin/clinic-settings').set(auth(adminToken)).send({ timezone: TZ });
    expect(ok.status).toBe(200);
    expect(ok.body.data.setting.timezone).toBe(TZ);
  });

  test('creates doctor and weekly availability 07:00-09:00 clinic time', async () => {
    const doc = await request(app)
      .post('/api/admin/doctors')
      .set(auth(adminToken))
      .send({ name: 'Dr. Tanaka', specialization: 'Cardiology' });
    expect(doc.status).toBe(201);
    doctorId = doc.body.data.doctor.id;
    slotsUrl = `/api/doctors/${doctorId}/slots?date=${localDate}`;

    const dow = at('00:00').weekday % 7;
    const avail = await request(app)
      .post(`/api/admin/doctors/${doctorId}/availability`)
      .set(auth(adminToken))
      .send({ dayOfWeek: dow, startTime: '07:00', endTime: '09:00', slotDurationMinutes: 30 });
    expect(avail.status).toBe(201);
  });

  test('rejects overlapping availability windows', async () => {
    const dow = at('00:00').weekday % 7;
    const res = await request(app)
      .post(`/api/admin/doctors/${doctorId}/availability`)
      .set(auth(adminToken))
      .send({ dayOfWeek: dow, startTime: '08:30', endTime: '10:00' });
    expect(res.status).toBe(409);
  });

  test('validates availability updates and id params', async () => {
    const bad = await request(app).put('/api/admin/availability/1').set(auth(adminToken)).send({ startTime: 'noon' });
    expect(bad.status).toBe(422);
    const badId = await request(app).delete('/api/admin/doctors/abc').set(auth(adminToken));
    expect(badId.status).toBe(422);
  });

  test('rejects datetimes without a timezone offset', async () => {
    const res = await request(app)
      .post(`/api/admin/doctors/${doctorId}/unavailability`)
      .set(auth(adminToken))
      .send({ startAt: `${localDate}T07:30:00`, endAt: `${localDate}T08:00:00`, type: 'BREAK' });
    expect(res.status).toBe(422);
  });
});

describe('slots & booking', () => {
  test('slots are generated in clinic timezone and returned in UTC', async () => {
    const res = await request(app).get(slotsUrl).set(auth(userToken));
    expect(res.status).toBe(200);
    expect(res.body.data.timezone).toBe(TZ);
    expect(res.body.data.slots).toHaveLength(4);
    expect(res.body.data.slots[0].startTime).toBe(at('07:00').toUTC().toISO());
    // 07:00 Tokyo is 22:00 UTC on the previous day
    expect(res.body.data.slots[0].startTime.slice(11, 16)).toBe('22:00');
  });

  test('a break removes the overlapping slot', async () => {
    const res = await request(app)
      .post(`/api/admin/doctors/${doctorId}/unavailability`)
      .set(auth(adminToken))
      .send({ startAt: at('07:30').toISO(), endAt: at('08:00').toISO(), type: 'BREAK', reason: 'Tea' });
    expect(res.status).toBe(201);
    const slots = (await request(app).get(slotsUrl).set(auth(userToken))).body.data.slots;
    expect(slots.map((s) => s.startTime)).not.toContain(at('07:30').toUTC().toISO());
    expect(slots).toHaveLength(3);
  });

  test('books a slot whose clinic-local date differs from its UTC date', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set(auth(userToken))
      .send({ doctorId, startTime: at('07:00').toISO() }); // sent with +09:00 offset
    expect(res.status).toBe(201);
    expect(new Date(res.body.data.appointment.startTime).toISOString()).toBe(at('07:00').toUTC().toISO());
    expect(new Date(res.body.data.appointment.endTime).toISOString()).toBe(at('07:30').toUTC().toISO());
  });

  test('booked slot is no longer returned as available', async () => {
    const slots = (await request(app).get(slotsUrl).set(auth(userToken))).body.data.slots;
    expect(slots.map((s) => s.startTime)).not.toContain(at('07:00').toUTC().toISO());
  });

  test('rejects re-booking, break slots and off-grid times with 409', async () => {
    for (const t of ['07:00', '07:30', '07:10']) {
      const res = await request(app).post('/api/appointments').set(auth(userToken)).send({ doctorId, startTime: at(t).toISO() });
      expect(res.status).toBe(409);
    }
  });

  test('ADMIN cannot book', async () => {
    const res = await request(app).post('/api/appointments').set(auth(adminToken)).send({ doctorId, startTime: at('08:00').toISO() });
    expect(res.status).toBe(403);
  });

  test('concurrent requests for the same slot: exactly one succeeds', async () => {
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) => registerUser(`racer${i}@example.com`))
    );
    const responses = await Promise.all(
      users.map((u) =>
        request(app).post('/api/appointments').set(auth(u.token)).send({ doctorId, startTime: at('08:00').toISO() })
      )
    );
    const codes = responses.map((r) => r.status);
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(9);
    const count = await db.Appointment.count({ where: { doctorId, startTime: at('08:00').toJSDate(), status: 'BOOKED' } });
    expect(count).toBe(1);
  });

  test('database rejects overlapping bookings even when the API is bypassed', async () => {
    await expect(
      db.Appointment.create({
        doctorId,
        userId,
        startTime: at('08:15').toJSDate(), // overlaps the 08:00-08:30 booking
        endTime: at('08:45').toJSDate(),
        status: 'BOOKED'
      })
    ).rejects.toMatchObject({ name: 'SequelizeExclusionConstraintError' });
  });
});

describe('listing & cancellation', () => {
  let appointmentId;

  test('my appointments are paginated', async () => {
    const res = await request(app).get('/api/appointments/me?limit=1').set(auth(userToken));
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 1, total: 1 });
    appointmentId = res.body.data.appointments[0].id;
  });

  test("another user cannot cancel someone else's appointment", async () => {
    const other = await registerUser('other@example.com');
    const res = await request(app).delete(`/api/appointments/${appointmentId}`).set(auth(other.token));
    expect(res.status).toBe(404);
  });

  test('owner cancels and the slot becomes available again', async () => {
    const res = await request(app).delete(`/api/appointments/${appointmentId}`).set(auth(userToken));
    expect(res.status).toBe(200);
    expect(res.body.data.appointment.status).toBe('CANCELLED');
    const slots = (await request(app).get(slotsUrl).set(auth(userToken))).body.data.slots;
    expect(slots.map((s) => s.startTime)).toContain(at('07:00').toUTC().toISO());
  });

  test('admin lists all appointments with filters', async () => {
    const res = await request(app).get(`/api/admin/appointments?doctorId=${doctorId}&status=BOOKED`).set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data.appointments[0].user.email).toMatch(/^racer\d@example\.com$/);
  });

  test('adding leave over a booking reports the conflict', async () => {
    const res = await request(app)
      .post(`/api/admin/doctors/${doctorId}/unavailability`)
      .set(auth(adminToken))
      .send({ startAt: at('08:00').toISO(), endAt: at('09:00').toISO(), type: 'LEAVE' });
    expect(res.status).toBe(201);
    expect(res.body.data.conflictingAppointments).toHaveLength(1);
  });
});

describe('error handling', () => {
  test('malformed JSON -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('unknown route -> 404', async () => {
    expect((await request(app).get('/api/nope')).status).toBe(404);
  });
});
