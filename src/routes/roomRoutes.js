const express = require('express');
const router = express.Router();

const roomController = require('../controllers/roomController');

router.post('/rooms', roomController.createRoom);
router.get('/rooms', roomController.getAllRooms);
router.put('/rooms', roomController.updateRoom);
router.delete('/rooms', roomController.deleteRoom);

module.exports = router;