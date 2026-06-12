const BookingSlot = require("../models/BookingSlot");

const generateTimeSlots = () => {
    const slots = [];

    let hour = 0;
    let minute = 0;

    while (hour < 24) {
        const start = `${String(hour).padStart(2, "0")}:${String(
            minute
        ).padStart(2, "0")}`;

        minute += 30;

        if (minute === 60) {
            hour += 1;
            minute = 0;
        }

        const end = `${String(hour).padStart(2, "0")}:${String(
            minute
        ).padStart(2, "0")}`;

        slots.push({
            start,
            end,
        });
    }

    return slots;
};
module.exports = {
    getRoomAvailability: async (req, res) => {
        try {
            const { id } = req.params;
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: "Date is required",
                    status: 400,
                });
            }

            const bookedSlots = await BookingSlot.find({
                room: id,
                date,
                status: "active",
            });

            const bookedMap = new Set(
                bookedSlots.map((slot) => slot.slotStart)
            );

            const allSlots = generateTimeSlots();

            const availability = allSlots.map((slot) => ({
                start: slot.start,
                end: slot.end,
                available: !bookedMap.has(slot.start),
            }));

            res.status(200).json({
                success: true,
                data: availability,
                status: 200,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
                status: 500,
            });
        }
    }
}
