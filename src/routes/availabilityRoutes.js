const express = require("express");
const router = express.Router();

const availabilityController = require("../controllers/availabilityController");

router.get("/rooms/:id/availability", availabilityController.getRoomAvailability);

module.exports = router;