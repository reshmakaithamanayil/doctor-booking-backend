'use strict';

// OpenAPI 3.0 specification for the Doctor Booking API.
// Served by swagger-ui-express at /api-docs (see src/app.js).
// Keep this file in sync when routes, validators or response shapes change.

const idParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', minimum: 1 },
  example: 1
});

const successEnvelope = (dataSchema, exampleMessage) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: exampleMessage },
    ...(dataSchema ? { data: dataSchema } : {})
  }
});

const jsonResponse = (description, schema) => ({
  description,
  content: { 'application/json': { schema } }
});

const ok = (description, dataSchema, message = 'Success') =>
  jsonResponse(description, successEnvelope(dataSchema, message));

const objectWith = (key, ref) => ({
  type: 'object',
  properties: { [key]: { $ref: `#/components/schemas/${ref}` } }
});

const arrayWith = (key, ref) => ({
  type: 'object',
  properties: { [key]: { type: 'array', items: { $ref: `#/components/schemas/${ref}` } } }
});

const paginated = (key, ref, message) =>
  jsonResponse(message, {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: message },
      data: { type: 'object', properties: { [key]: { type: 'array', items: { $ref: `#/components/schemas/${ref}` } } } },
      meta: { $ref: '#/components/schemas/PaginationMeta' }
    }
  });

const pageParams = [
  { $ref: '#/components/parameters/page' },
  { $ref: '#/components/parameters/limit' }
];

const statusQuery = {
  name: 'status',
  in: 'query',
  required: false,
  schema: { type: 'string', enum: ['BOOKED', 'CANCELLED'] }
};

const jsonBody = (ref, required = true) => ({
  required,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } }
});

const errors = (...codes) =>
  codes.reduce((acc, code) => {
    acc[code] = { $ref: `#/components/responses/E${code}` };
    return acc;
  }, {});

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Doctor Booking API',
    version: '1.0.0',
    description:
      'Backend for a clinic doctor-booking system (Node.js, Express, PostgreSQL, Sequelize).\n\n' +
      '**Authentication:** call `POST /api/auth/login` (or `/register`), copy `data.token`, then click ' +
      '**Authorize** and paste it. The seeded admin is `admin@clinic.com` / `Admin@123`.\n\n' +
      '**Time handling:** doctor weekly availability (`HH:mm`) is clinic-local wall-clock time in the clinic ' +
      'timezone (see clinic settings). All other datetimes (slots, appointments, unavailability) are absolute ' +
      'ISO 8601 instants and are returned in UTC.\n\n' +
      '**Response envelope:** success responses are `{ success: true, message, data }`; errors are ' +
      '`{ success: false, message }`, plus `errors[]` for request validation failures (422). List endpoints ' +
      'are paginated with `?page=&limit=` (limit max 100) and return `meta: { page, limit, total, totalPages }`.\n\n' +
      '**Concurrency:** bookings for the same doctor are serialised with a row lock, and the database rejects any ' +
      'overlapping BOOKED appointments for a doctor (exclusion constraint), so two users racing for the same slot ' +
      'get exactly one 201 and one 409.\n\n' +
      '**Rate limits:** 300 requests / 15 min per IP on `/api`, and 20 / 15 min on login and register (429 when exceeded).'
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth', description: 'Registration, login and current user' },
    { name: 'Doctors', description: 'Browse active doctors and their bookable slots (any logged-in user)' },
    { name: 'Appointments', description: 'Book, list and cancel appointments' },
    { name: 'Admin - Clinic', description: 'Clinic-wide settings (ADMIN only)' },
    { name: 'Admin - Doctors', description: 'Manage doctors (ADMIN only)' },
    { name: 'Admin - Availability', description: 'Recurring weekly working hours (ADMIN only)' },
    { name: 'Admin - Unavailability', description: 'Breaks, leave and other blocked time (ADMIN only)' },
    { name: 'Admin - Appointments', description: 'View all bookings (ADMIN only)' },
    { name: 'Admin - Users', description: 'Provision users/admins (ADMIN only)' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Asha Menon' },
          email: { type: 'string', format: 'email', example: 'asha@example.com' },
          role: { type: 'string', enum: ['ADMIN', 'USER'], example: 'USER' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Doctor: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Dr. Ravi Kumar' },
          specialization: { type: 'string', nullable: true, example: 'Cardiology' },
          email: { type: 'string', format: 'email', nullable: true, example: 'ravi@clinic.com' },
          phone: { type: 'string', nullable: true, example: '+91 98765 43210' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      DoctorPublic: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Dr. Ravi Kumar' },
          specialization: { type: 'string', nullable: true, example: 'Cardiology' }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 3 }
        }
      },
      Availability: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          doctorId: { type: 'integer', example: 1 },
          dayOfWeek: { type: 'integer', minimum: 0, maximum: 6, description: '0 = Sunday ... 6 = Saturday', example: 1 },
          startTime: { type: 'string', example: '09:00:00', description: 'Clinic-local time' },
          endTime: { type: 'string', example: '13:00:00', description: 'Clinic-local time' },
          slotDurationMinutes: { type: 'integer', example: 30 },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Unavailability: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          doctorId: { type: 'integer', example: 1 },
          startAt: { type: 'string', format: 'date-time', example: '2026-10-05T07:30:00.000Z' },
          endAt: { type: 'string', format: 'date-time', example: '2026-10-05T08:00:00.000Z' },
          type: { type: 'string', enum: ['BREAK', 'LEAVE', 'OTHER'], example: 'BREAK' },
          reason: { type: 'string', nullable: true, example: 'Lunch break' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Slot: {
        type: 'object',
        properties: {
          startTime: { type: 'string', format: 'date-time', example: '2026-10-05T03:30:00.000Z' },
          endTime: { type: 'string', format: 'date-time', example: '2026-10-05T04:00:00.000Z' }
        }
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          doctorId: { type: 'integer', example: 1 },
          userId: { type: 'integer', example: 2 },
          startTime: { type: 'string', format: 'date-time', example: '2026-10-05T03:30:00.000Z' },
          endTime: { type: 'string', format: 'date-time', example: '2026-10-05T04:00:00.000Z' },
          status: { type: 'string', enum: ['BOOKED', 'CANCELLED'], example: 'BOOKED' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      AppointmentWithDoctor: {
        allOf: [
          { $ref: '#/components/schemas/Appointment' },
          {
            type: 'object',
            properties: {
              doctor: {
                type: 'object',
                properties: {
                  id: { type: 'integer', example: 1 },
                  name: { type: 'string', example: 'Dr. Ravi Kumar' },
                  specialization: { type: 'string', nullable: true, example: 'Cardiology' }
                }
              }
            }
          }
        ]
      },
      AppointmentAdminView: {
        allOf: [
          { $ref: '#/components/schemas/AppointmentWithDoctor' },
          {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'integer', example: 2 },
                  name: { type: 'string', example: 'Asha Menon' },
                  email: { type: 'string', example: 'asha@example.com' }
                }
              }
            }
          }
        ]
      },
      ClinicSetting: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          timezone: { type: 'string', example: 'Asia/Kolkata' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      // ---------- Request bodies ----------
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', maxLength: 100, example: 'Asha Menon' },
          email: { type: 'string', format: 'email', description: 'Stored lower-cased', example: 'asha@example.com' },
          password: { type: 'string', minLength: 8, maxLength: 72, description: '8-72 chars, at least one letter and one number', example: 'secret123' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@clinic.com' },
          password: { type: 'string', example: 'Admin@123' }
        }
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Second Admin' },
          email: { type: 'string', format: 'email', example: 'admin2@clinic.com' },
          password: { type: 'string', minLength: 8, maxLength: 72, description: '8-72 chars, at least one letter and one number', example: 'Admin4567' },
          role: { type: 'string', enum: ['ADMIN', 'USER'], default: 'USER', example: 'ADMIN' }
        }
      },
      ClinicSettingRequest: {
        type: 'object',
        required: ['timezone'],
        properties: {
          timezone: { type: 'string', description: 'IANA timezone name', example: 'Asia/Kolkata' }
        }
      },
      CreateDoctorRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 100, example: 'Dr. Ravi Kumar' },
          specialization: { type: 'string', maxLength: 100, nullable: true, example: 'Cardiology' },
          email: { type: 'string', format: 'email', nullable: true, example: 'ravi@clinic.com' },
          phone: { type: 'string', nullable: true, description: '6-20 chars: digits, spaces, +, -, ( )', example: '+91 98765 43210' },
          isActive: { type: 'boolean', default: true }
        }
      },
      UpdateDoctorRequest: {
        type: 'object',
        description: 'All fields optional; only provided fields are changed.',
        properties: {
          name: { type: 'string', example: 'Dr. Ravi Kumar' },
          specialization: { type: 'string', example: 'Cardiology' },
          email: { type: 'string', format: 'email', example: 'ravi@clinic.com' },
          phone: { type: 'string', example: '+91 98765 43210' },
          isActive: { type: 'boolean', example: true }
        }
      },
      AvailabilityRequest: {
        type: 'object',
        required: ['dayOfWeek', 'startTime', 'endTime'],
        description: 'Clinic-local weekly window. Must not overlap another active window of the same doctor on the same day (409).',
        properties: {
          dayOfWeek: { type: 'integer', minimum: 0, maximum: 6, description: '0 = Sunday ... 6 = Saturday', example: 1 },
          startTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)(:[0-5]\\d)?$', example: '09:00' },
          endTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)(:[0-5]\\d)?$', example: '13:00' },
          slotDurationMinutes: { type: 'integer', minimum: 5, maximum: 480, default: 30, example: 30 },
          isActive: { type: 'boolean', default: true }
        }
      },
      UpdateAvailabilityRequest: {
        type: 'object',
        description: 'All fields optional; only provided fields are changed. startTime must remain before endTime.',
        properties: {
          dayOfWeek: { type: 'integer', minimum: 0, maximum: 6, example: 1 },
          startTime: { type: 'string', example: '10:00' },
          endTime: { type: 'string', example: '14:00' },
          slotDurationMinutes: { type: 'integer', minimum: 5, maximum: 480, example: 20 },
          isActive: { type: 'boolean', example: true }
        }
      },
      UnavailabilityRequest: {
        type: 'object',
        required: ['startAt', 'endAt'],
        properties: {
          startAt: { type: 'string', format: 'date-time', description: 'Must include an offset (Z or +HH:mm)', example: '2026-10-05T13:00:00+05:30' },
          endAt: { type: 'string', format: 'date-time', description: 'Must include an offset; after startAt', example: '2026-10-05T13:30:00+05:30' },
          type: { type: 'string', enum: ['BREAK', 'LEAVE', 'OTHER'], default: 'OTHER', example: 'BREAK' },
          reason: { type: 'string', maxLength: 255, example: 'Lunch break' }
        }
      },
      BookAppointmentRequest: {
        type: 'object',
        required: ['doctorId', 'startTime'],
        properties: {
          doctorId: { type: 'integer', example: 1 },
          startTime: {
            type: 'string',
            format: 'date-time',
            description: 'Must be the same instant as a `startTime` returned by GET /api/doctors/{doctorId}/slots (any offset, e.g. Z or +05:30)',
            example: '2026-10-05T03:30:00.000Z'
          }
        }
      },

      // ---------- Errors ----------
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Something went wrong' }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'A valid email is required' }
              }
            }
          }
        }
      }
    },
    parameters: {
      page: { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
      limit: { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
    },
    responses: {
      E400: jsonResponse('Bad request', { $ref: '#/components/schemas/Error' }),
      E401: jsonResponse('Missing, invalid or expired token / wrong credentials', { $ref: '#/components/schemas/Error' }),
      E403: jsonResponse('Authenticated but not allowed for this role', { $ref: '#/components/schemas/Error' }),
      E404: jsonResponse('Resource not found', { $ref: '#/components/schemas/Error' }),
      E409: jsonResponse('Conflict (duplicate record or slot no longer available)', { $ref: '#/components/schemas/Error' }),
      E413: jsonResponse('Request body larger than 10kb', { $ref: '#/components/schemas/Error' }),
      E422: jsonResponse('Request validation failed', { $ref: '#/components/schemas/ValidationError' }),
      E429: jsonResponse('Rate limit exceeded', { $ref: '#/components/schemas/Error' }),
      E503: jsonResponse('Service unavailable', { $ref: '#/components/schemas/Error' })
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        description: 'Also checks database connectivity.',
        responses: {
          200: ok(
            'API and database are up',
            { type: 'object', properties: { database: { type: 'string', example: 'up' } } },
            'Doctor Booking API is running'
          ),
          ...errors(503)
        }
      }
    },

    // ---------- Auth ----------
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new patient (always role USER)',
        security: [],
        requestBody: jsonBody('RegisterRequest'),
        responses: {
          201: ok(
            'Registered',
            {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' }
              }
            },
            'Registration successful'
          ),
          ...errors(409, 422, 429)
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a JWT',
        security: [],
        requestBody: jsonBody('LoginRequest'),
        responses: {
          200: ok(
            'Logged in',
            {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' }
              }
            },
            'Login successful'
          ),
          ...errors(401, 422, 429)
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the currently authenticated user',
        responses: { 200: ok('Current user', objectWith('user', 'User'), 'Current user'), ...errors(401) }
      }
    },

    // ---------- Doctors (public to logged-in users) ----------
    '/api/doctors': {
      get: {
        tags: ['Doctors'],
        summary: 'List active doctors',
        parameters: [
          ...pageParams,
          {
            name: 'specialization',
            in: 'query',
            required: false,
            description: 'Case-insensitive partial match',
            schema: { type: 'string', example: 'cardio' }
          }
        ],
        responses: { 200: paginated('doctors', 'DoctorPublic', 'Available doctors'), ...errors(401, 422) }
      }
    },
    '/api/doctors/{doctorId}/slots': {
      get: {
        tags: ['Doctors'],
        summary: 'Get available slots for a doctor on a date',
        description:
          '`date` is interpreted in the clinic timezone. Slots overlapping breaks/leave or existing bookings, ' +
          'and slots in the past, are excluded. Returned times are UTC ISO strings; convert them to the ' +
          "viewer's local timezone for display.",
        parameters: [
          idParam('doctorId', 'Doctor ID'),
          {
            name: 'date',
            in: 'query',
            required: true,
            description: 'Calendar date in YYYY-MM-DD (clinic-local)',
            schema: { type: 'string', format: 'date', example: '2026-10-05' }
          }
        ],
        responses: {
          200: ok(
            'Available slots',
            {
              type: 'object',
              properties: {
                timezone: { type: 'string', example: 'Asia/Kolkata' },
                date: { type: 'string', example: '2026-10-05' },
                slots: { type: 'array', items: { $ref: '#/components/schemas/Slot' } }
              }
            },
            'Available slots'
          ),
          ...errors(400, 401, 404, 422)
        }
      }
    },

    // ---------- Appointments ----------
    '/api/appointments': {
      post: {
        tags: ['Appointments'],
        summary: 'Book an appointment (USER role only)',
        description:
          'The server recomputes the slot end time from the doctor\'s schedule and re-checks availability inside ' +
          'a locked transaction, so concurrent requests for the same slot cannot both succeed. ' +
          'Returns 409 if the slot is not (or no longer) available.',
        requestBody: jsonBody('BookAppointmentRequest'),
        responses: {
          201: ok('Booked', objectWith('appointment', 'Appointment'), 'Appointment booked successfully'),
          ...errors(400, 401, 403, 404, 409, 422)
        }
      }
    },
    '/api/appointments/me': {
      get: {
        tags: ['Appointments'],
        summary: 'List my appointments (newest first)',
        parameters: [...pageParams, statusQuery],
        responses: {
          200: paginated('appointments', 'AppointmentWithDoctor', 'Your appointments'),
          ...errors(401, 422)
        }
      }
    },
    '/api/appointments/{appointmentId}': {
      delete: {
        tags: ['Appointments'],
        summary: 'Cancel an appointment (owner or ADMIN)',
        description:
          'Users may cancel only their own future appointments; admins may cancel any. Appointments owned by ' +
          'someone else return 404. The freed slot becomes bookable again.',
        parameters: [idParam('appointmentId', 'Appointment ID')],
        responses: {
          200: ok('Cancelled', objectWith('appointment', 'Appointment'), 'Appointment cancelled'),
          ...errors(400, 401, 404, 422)
        }
      }
    },

    // ---------- Admin: clinic settings ----------
    '/api/admin/clinic-settings': {
      get: {
        tags: ['Admin - Clinic'],
        summary: 'Get clinic settings',
        responses: {
          200: ok('Clinic settings', objectWith('setting', 'ClinicSetting'), 'Clinic settings'),
          ...errors(401, 403)
        }
      },
      put: {
        tags: ['Admin - Clinic'],
        summary: 'Update clinic timezone',
        requestBody: jsonBody('ClinicSettingRequest'),
        responses: {
          200: ok('Updated', objectWith('setting', 'ClinicSetting'), 'Clinic timezone updated'),
          ...errors(400, 401, 403, 422)
        }
      }
    },

    // ---------- Admin: doctors ----------
    '/api/admin/doctors': {
      get: {
        tags: ['Admin - Doctors'],
        summary: 'List all doctors (including inactive)',
        parameters: pageParams,
        responses: { 200: paginated('doctors', 'Doctor', 'Doctors'), ...errors(401, 403, 422) }
      },
      post: {
        tags: ['Admin - Doctors'],
        summary: 'Create a doctor',
        requestBody: jsonBody('CreateDoctorRequest'),
        responses: {
          201: ok('Created', objectWith('doctor', 'Doctor'), 'Doctor created'),
          ...errors(401, 403, 409, 422)
        }
      }
    },
    '/api/admin/doctors/{doctorId}': {
      get: {
        tags: ['Admin - Doctors'],
        summary: 'Get a doctor',
        parameters: [idParam('doctorId', 'Doctor ID')],
        responses: {
          200: ok('Doctor', objectWith('doctor', 'Doctor'), 'Doctor'),
          ...errors(401, 403, 404, 422)
        }
      },
      put: {
        tags: ['Admin - Doctors'],
        summary: 'Update a doctor',
        parameters: [idParam('doctorId', 'Doctor ID')],
        requestBody: jsonBody('UpdateDoctorRequest'),
        responses: {
          200: ok('Updated', objectWith('doctor', 'Doctor'), 'Doctor updated'),
          ...errors(401, 403, 404, 409, 422)
        }
      },
      delete: {
        tags: ['Admin - Doctors'],
        summary: 'Deactivate a doctor (soft delete)',
        parameters: [idParam('doctorId', 'Doctor ID')],
        responses: {
          200: ok('Deactivated', objectWith('doctor', 'Doctor'), 'Doctor deactivated'),
          ...errors(401, 403, 404, 422)
        }
      }
    },

    // ---------- Admin: availability ----------
    '/api/admin/doctors/{doctorId}/availability': {
      get: {
        tags: ['Admin - Availability'],
        summary: "List a doctor's weekly availability",
        parameters: [idParam('doctorId', 'Doctor ID')],
        responses: {
          200: ok('Availability', arrayWith('availabilities', 'Availability'), 'Doctor availability'),
          ...errors(401, 403, 422)
        }
      },
      post: {
        tags: ['Admin - Availability'],
        summary: 'Add a weekly availability window',
        parameters: [idParam('doctorId', 'Doctor ID')],
        requestBody: jsonBody('AvailabilityRequest'),
        responses: {
          201: ok('Added', objectWith('availability', 'Availability'), 'Availability added'),
          ...errors(400, 401, 403, 404, 409, 422)
        }
      }
    },
    '/api/admin/availability/{availabilityId}': {
      put: {
        tags: ['Admin - Availability'],
        summary: 'Update an availability window',
        parameters: [idParam('availabilityId', 'Availability entry ID')],
        requestBody: jsonBody('UpdateAvailabilityRequest'),
        responses: {
          200: ok('Updated', objectWith('availability', 'Availability'), 'Availability updated'),
          ...errors(400, 401, 403, 404, 409, 422)
        }
      },
      delete: {
        tags: ['Admin - Availability'],
        summary: 'Delete an availability window',
        parameters: [idParam('availabilityId', 'Availability entry ID')],
        responses: { 200: ok('Removed', null, 'Availability removed'), ...errors(401, 403, 404, 422) }
      }
    },

    // ---------- Admin: unavailability ----------
    '/api/admin/doctors/{doctorId}/unavailability': {
      get: {
        tags: ['Admin - Unavailability'],
        summary: "List a doctor's breaks / leave",
        parameters: [
          idParam('doctorId', 'Doctor ID'),
          {
            name: 'includePast',
            in: 'query',
            required: false,
            description: 'Include entries that have already ended (default false)',
            schema: { type: 'string', enum: ['true', 'false'], default: 'false' }
          }
        ],
        responses: {
          200: ok('Unavailability', arrayWith('unavailabilities', 'Unavailability'), 'Doctor unavailability'),
          ...errors(401, 403, 422)
        }
      },
      post: {
        tags: ['Admin - Unavailability'],
        summary: 'Add a break / leave / blocked period',
        description:
          'Slots overlapping this period stop being offered immediately. Existing bookings are NOT cancelled ' +
          'automatically; they are returned in `conflictingAppointments` so the admin can act on them.',
        parameters: [idParam('doctorId', 'Doctor ID')],
        requestBody: jsonBody('UnavailabilityRequest'),
        responses: {
          201: ok(
            'Added',
            {
              type: 'object',
              properties: {
                unavailability: { $ref: '#/components/schemas/Unavailability' },
                conflictingAppointments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 7 },
                      userId: { type: 'integer', example: 2 },
                      startTime: { type: 'string', format: 'date-time' },
                      endTime: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            },
            'Unavailability added'
          ),
          ...errors(400, 401, 403, 404, 422)
        }
      }
    },
    '/api/admin/unavailability/{unavailabilityId}': {
      delete: {
        tags: ['Admin - Unavailability'],
        summary: 'Delete an unavailability entry',
        parameters: [idParam('unavailabilityId', 'Unavailability entry ID')],
        responses: { 200: ok('Removed', null, 'Unavailability removed'), ...errors(401, 403, 404, 422) }
      }
    },

    // ---------- Admin: appointments ----------
    '/api/admin/appointments': {
      get: {
        tags: ['Admin - Appointments'],
        summary: 'List all appointments (earliest first)',
        parameters: [
          ...pageParams,
          { name: 'doctorId', in: 'query', required: false, schema: { type: 'integer', minimum: 1 } },
          statusQuery,
          {
            name: 'from',
            in: 'query',
            required: false,
            description: 'Only appointments starting at or after this instant',
            schema: { type: 'string', format: 'date-time', example: '2026-10-01T00:00:00Z' }
          },
          {
            name: 'to',
            in: 'query',
            required: false,
            description: 'Only appointments starting before this instant',
            schema: { type: 'string', format: 'date-time', example: '2026-11-01T00:00:00Z' }
          }
        ],
        responses: {
          200: paginated('appointments', 'AppointmentAdminView', 'Appointments'),
          ...errors(401, 403, 422)
        }
      }
    },

    // ---------- Admin: users ----------
    '/api/admin/users': {
      post: {
        tags: ['Admin - Users'],
        summary: 'Create a user or another admin',
        requestBody: jsonBody('CreateUserRequest'),
        responses: {
          201: ok('Created', objectWith('user', 'User'), 'User created'),
          ...errors(401, 403, 409, 422)
        }
      }
    }
  }
};

module.exports = spec;
