const express = require('express');
const router = express.Router();

const BookingController = require('../controllers/bookingController');

router.post('/bookings', BookingController.createBooking);
router.delete('/bookings', BookingController.cancelBooking);
router.get('/bookings', BookingController.getBooking);
router.put('/bookings', BookingController.rescheduleBooking);

module.exports = router;

