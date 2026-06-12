const mongoose = require("mongoose");

const bookingSlotSchema = new mongoose.Schema(
    {
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },

        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
        },

        date: {
            type: String,
            required: true,
        },

        slotStart: {
            type: String,
            required: true,
        },

        slotEnd: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: ["active", "cancelled"],
            default: "active",
        },
    },
    {
        timestamps: true,
    }
);
bookingSlotSchema.index(
    {
        room: 1,
        date: 1,
        slotStart: 1,
    },
    {
        unique: true,
    }
);


module.exports = mongoose.model("BookingSlot", bookingSlotSchema);