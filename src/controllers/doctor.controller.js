'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, paginationMeta } = require('../utils/pagination');
const slotService = require('../services/slot.service');

const listDoctors = catchAsync(async (req, res) => {
  const pagination = getPagination(req.query);
  const where = { isActive: true };
  if (req.query.specialization) {
    where.specialization = { [Op.iLike]: `%${req.query.specialization}%` };
  }

  const { rows, count } = await db.Doctor.findAndCountAll({
    where,
    attributes: ['id', 'name', 'specialization'],
    order: [['name', 'ASC'], ['id', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset
  });
  sendSuccess(res, {
    message: 'Available doctors',
    data: { doctors: rows },
    meta: paginationMeta(pagination, count)
  });
});

const getDoctorSlots = catchAsync(async (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query;

  const result = await slotService.getAvailableSlots(doctorId, date);

  sendSuccess(res, {
    message: 'Available slots',
    data: result
  });
});

module.exports = { listDoctors, getDoctorSlots };
