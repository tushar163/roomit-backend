const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    bookedBy: {
      name: {
        type: String,
        required: true,
      },

      email: {
        type: String,
        required: true,
        lowercase: true,
      },
    },

    status: {
      type: String,
      enum: [
        "confirmed",
        "cancelled-refundable",
        "cancelled-non-refundable",
      ],
      default: "confirmed",
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
bookingSchema.index(
  {
    room: 1,
    date: 1,
    startTime: 1,
    endTime: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);