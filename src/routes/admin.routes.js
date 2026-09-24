'use strict';

const express = require('express');
const adminController = require('../controllers/admin.controller');
const appointmentController = require('../controllers/appointment.controller');
const { protect } = require('../middlewares/auth.middleware');
const { restrictTo } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  clinicSettingRules,
  doctorIdRules,
  availabilityIdRules,
  unavailabilityIdRules,
  createDoctorRules,
  updateDoctorRules,
  availabilityRules,
  updateAvailabilityRules,
  unavailabilityRules,
  listUnavailabilityRules,
  listAppointmentsRules,
  paginationRules
} = require('../validators/admin.validator');
const { createUserRules } = require('../validators/auth.validator');

const router = express.Router();

router.use(protect, restrictTo('ADMIN'));

// Clinic settings
router
  .route('/clinic-settings')
  .get(adminController.getClinicSettings)
  .put(clinicSettingRules, validate, adminController.updateClinicSettings);

// Doctors
router
  .route('/doctors')
  .get(paginationRules, validate, adminController.listDoctorsAdmin)
  .post(createDoctorRules, validate, adminController.createDoctor);

router
  .route('/doctors/:doctorId')
  .get(doctorIdRules, validate, adminController.getDoctorAdmin)
  .put(updateDoctorRules, validate, adminController.updateDoctor)
  .delete(doctorIdRules, validate, adminController.deleteDoctor);

// Doctor availability 
router
  .route('/doctors/:doctorId/availability')
  .get(doctorIdRules, validate, adminController.listAvailability)
  .post(availabilityRules, validate, adminController.addAvailability);

router
  .route('/availability/:availabilityId')
  .put(updateAvailabilityRules, validate, adminController.updateAvailability)
  .delete(availabilityIdRules, validate, adminController.deleteAvailability);

// Doctor unavailability 
router
  .route('/doctors/:doctorId/unavailability')
  .get(listUnavailabilityRules, validate, adminController.listUnavailability)
  .post(unavailabilityRules, validate, adminController.addUnavailability);

router
  .route('/unavailability/:unavailabilityId')
  .delete(unavailabilityIdRules, validate, adminController.deleteUnavailability);

// All appointments 
router.get('/appointments', listAppointmentsRules, validate, appointmentController.listAllAppointments);

// User management 
router.post('/users', createUserRules, validate, adminController.createUser);

module.exports = router;
