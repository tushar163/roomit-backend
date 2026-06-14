const mongoose = require("mongoose");
const { differenceInHours } = require("date-fns");
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
    }
};