const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const BookingSlot = require("../models/BookingSlot");

const generateSlots = require("../utils/generateSlots");

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

            // CREATE MAIN BOOKING
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

            // GENERATE SLOTS
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
    }
};