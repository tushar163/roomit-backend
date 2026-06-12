const express = require('express');
const router = express.Router();

const BookingController = require('../controllers/bookingController');

router.post('/bookings', BookingController.createBooking);

module.exports = router;

