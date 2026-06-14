const express = require('express');
const router = express.Router();

const BookingController = require('../controllers/bookingController');

router.post('/bookings', BookingController.createBooking);
router.delete('/bookings', BookingController.cancelBooking);
router.get('/bookings', BookingController.getBooking);

module.exports = router;

