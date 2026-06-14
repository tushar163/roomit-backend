const Roome = require('../models/Room');

module.exports = {
    createRoom: async (req, res) => {
        try {
            const { name, floor, capacity, bufferTime } = req.body;
            const room = await Roome.create({ name, floor, capacity, bufferTime });
            res.status(201).json({ success: true, data: room, message: "Room created successfully", status: 201 });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message, message: "Failed to create room", status: 400 });
        }
    },
    getAllRooms: async (req, res) => {

        try {
            if (req.query.id) {
                const room = await Roome.findById(req.query.id);
                if (!room) {
                    return res.status(404).json({ success: false, message: "Room not found", status: 404 });
                }
                res.status(200).json({ success: true, data: room, message: "Room retrieved successfully", status: 200 });
            } else {
                const rooms = await Roome.find();
                res.status(200).json({ success: true, data: rooms, message: "Rooms retrieved successfully", status: 200 });
            }
        } catch (error) {
            res.status(400).json({ success: false, error: error.message, message: "Failed to retrieve rooms", status: 400 });
        }
    },
    updateRoom: async (req, res) => {
        try {
            const { id } = req.query;
            const { name, floor, capacity, bufferTime } = req.body;
            const room = await Roome.findByIdAndUpdate(id, { name, floor, capacity, bufferTime }, { new: true });
            if (!room) {
                return res.status(404).json({ success: false, message: "Room not found", status: 404 });
            }
            res.status(200).json({ success: true, data: room, message: "Room updated successfully", status: 200 });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message, message: "Failed to update room", status: 400 });
        }
    },
    deleteRoom: async (req, res) => {
        try {
            const { id } = req.query;
            const room = await Roome.findByIdAndDelete(id);
            if (!room) {
                return res.status(404).json({ success: false, message: "Room not found", status: 404 });
            }
            res.status(200).json({ success: true, message: "Room deleted successfully", status: 200 });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message, message: "Failed to delete room", status: 400 });
        }
    }
};