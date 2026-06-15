const mongoose = require("mongoose");
const { differenceInHours } = require("date-fns");
const Booking = require("../models/Booking");
const BookingSlot = require("../models/BookingSlot");

const Room = require("../models/Room");
const generateSlots = require("../utils/generateSlots");
const addBufferSlots = require("../utils/addBufferSlots");

module.exports = {
    createBooking: async (req, res) => {
        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            const {
                room,
                date,
                startTime,
                endTime,
                title,
                bookedBy,
            } = req.body;

            const booking = await Booking.create(
                [
                    {
                        room,
                        date,
                        startTime,
                        endTime,
                        title,
                        bookedBy,
                    },
                ],
                { session }
            );

            const slots = generateSlots(
                startTime,
                endTime
            );

            // CREATE SLOT DOCS
            const slotDocs = slots.map((slot) => ({
                room,
                booking: booking[0]._id,
                date,
                slotStart: slot.slotStart,
                slotEnd: slot.slotEnd,
            }));
            await BookingSlot.insertMany(slotDocs, {
                session,
            });

            await session.commitTransaction();

            session.endSession();

            res.status(201).json({
                success: true,
                message: "Booking created successfully",
                data: booking[0],
            });
        } catch (error) {
            await session.abortTransaction();

            session.endSession();
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Slot already booked by another user",
                    status: 409,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message,
                status: 500,
            });
        }
    },
    cancelBooking: async (req, res) => {
        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            const { id } = req.query;

            const booking = await Booking.findById(id).session(
                session
            );

            if (!booking) {
                await session.abortTransaction();

                session.endSession();

                return res.status(404).json({
                    success: false,
                    message: "Booking not found",
                });
            }
            if (booking.status !== "confirmed") {
                await session.abortTransaction();

                session.endSession();

                return res.status(400).json({
                    success: false,
                    message: "Booking already cancelled",
                });
            }
            const bookingStart = new Date(
                `${booking.date}T${booking.startTime}:00`
            );

            const now = new Date();

            const refundable =
                differenceInHours(bookingStart, now) >= 2;
            booking.status = refundable
                ? "cancelled-refundable"
                : "cancelled-non-refundable";

            booking.cancelledAt = new Date();

            await booking.save({ session });
            await BookingSlot.updateMany(
                {
                    booking: booking._id,
                },
                {
                    status: "cancelled",
                },
                {
                    session,
                }
            );

            await session.commitTransaction();

            session.endSession();

            res.status(200).json({
                success: true,
                message: refundable
                    ? "Booking cancelled with refund"
                    : "Booking cancelled without refund",
                data: booking,
            });
        } catch (error) {
            await session.abortTransaction();

            session.endSession();

            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    },
    getBooking: async (req, res) => {
        try {
            const { email } = req.query;
            const booking = await Booking.find({ "bookedBy.email": email });
            if (!booking) {
                return res.status(404).json({ success: false, message: "Booking not found", status: 404 });
            }
            res.status(200).json({ success: true, data: booking, message: "Booking retrieved successfully", status: 200 });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message, message: "Failed to retrieve booking", status: 400 });
        }
    },
    rescheduleBooking: async (req, res) => {
        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            const { id } = req.query;

            const {
                date,
                startTime,
                endTime,
            } = req.body;

            // FIND BOOKING
            const booking = await Booking.findById(id).session(
                session
            );

            if (!booking) {
                await session.abortTransaction();

                session.endSession();

                return res.status(404).json({
                    success: false,
                    message: "Booking not found",
                });
            }

            // ONLY CONFIRMED BOOKINGS
            if (booking.status !== "confirmed") {
                await session.abortTransaction();

                session.endSession();

                return res.status(400).json({
                    success: false,
                    message:
                        "Only confirmed bookings can be rescheduled",
                });
            }

            // GET ROOM
            const room = await Room.findById(
                booking.room
            ).session(session);

            if (!room) {
                await session.abortTransaction();

                session.endSession();

                return res.status(404).json({
                    success: false,
                    message: "Room not found",
                });
            }

            // DELETE OLD SLOTS
            await BookingSlot.deleteMany(
                {
                    booking: booking._id,
                },
                { session }
            );

            // GENERATE NEW SLOTS
            let slots = generateSlots(
                startTime,
                endTime
            );

            // ADD BUFFER
            slots = addBufferSlots(
                slots,
                room.bufferTime
            );

            // PREPARE SLOT DOCS
            const slotDocs = slots.map((slot) => ({
                room: booking.room,
                booking: booking._id,
                date,
                slotStart: slot.slotStart,
                slotEnd: slot.slotEnd,
                isBuffer: slot.isBuffer || false,
            }));

            // INSERT NEW SLOTS
            // UNIQUE INDEX WILL HANDLE CONFLICTS
            await BookingSlot.insertMany(slotDocs, {
                session,
            });

            // UPDATE BOOKING
            booking.date = date;
            booking.startTime = startTime;
            booking.endTime = endTime;

            await booking.save({ session });

            // COMMIT
            await session.commitTransaction();

            session.endSession();

            return res.status(200).json({
                success: true,
                message:
                    "Booking rescheduled successfully",
                data: booking,
            });
        } catch (error) {
            await session.abortTransaction();

            session.endSession();

            // SLOT CONFLICT
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Selected slot is already booked",
                });
            }

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    },
};