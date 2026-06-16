const Booking = require("../models/Booking");
const BookingSlot = require("../models/BookingSlot");
const Room = require("../models/Room");


const getDashboardData = async (req, res) => {
    try {
        const {
            availabilityRoomId,
            availabilityDate,
            bookingLimit = 10,
        } = req.query;

        const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

        // ─── Run independent queries in parallel ────────────────────────────────
        const [rooms, allBookings, todayBookings] = await Promise.all([
            Room.find().sort({ name: 1 }).lean(),

            Booking.find()
                .sort({ createdAt: -1 })
                .limit(Number(bookingLimit))
                .populate("room", "name floor capacity")
                .lean(),

            Booking.find({ date: today }).lean(),
        ]);

        // ─── Metrics ─────────────────────────────────────────────────────────────
        const totalBookingsCount = await Booking.countDocuments();
        const activeBookingsCount = await Booking.countDocuments({
            status: "confirmed",
        });
        const cancelledCount = await Booking.countDocuments({
            status: { $in: ["cancelled-refundable", "cancelled-non-refundable"] },
        });

        // Utilization per room: (booked slots today / total 30-min slots in 9-hour day)
        // Treat 09:00–18:00 = 18 slots of 30 min each as the denominator
        const TOTAL_DAILY_SLOTS = 18;
        const todaySlotCounts = await BookingSlot.aggregate([
            { $match: { date: today, status: "active" } },
            { $group: { _id: "$room", count: { $sum: 1 } } },
        ]);
        const slotCountByRoom = Object.fromEntries(
            todaySlotCounts.map((r) => [r._id.toString(), r.count])
        );

        // Build rooms array with utilization + nextAvailable
        const roomsWithMeta = rooms.map((room) => {
            const bookedSlots = slotCountByRoom[room._id.toString()] || 0;
            const utilization = Math.round((bookedSlots / TOTAL_DAILY_SLOTS) * 100);
            return {
                ...room,
                utilization,
                nextAvailable: null, // populated below if availabilityRoomId matches
            };
        });

        // ─── Metrics array (matches your frontend shape) ──────────────────────
        const metrics = [
            {
                label: "Total rooms",
                value: String(rooms.length),
                trend: `${rooms.length} registered`,
                tone: "violet",
            },
            {
                label: "Total bookings",
                value: totalBookingsCount.toLocaleString(),
                trend: "+18.2%", // derive from DB if you store historical snapshots
                tone: "cyan",
            },
            {
                label: "Active bookings",
                value: String(activeBookingsCount),
                trend: `${todayBookings.filter((b) => b.status === "confirmed").length} today`,
                tone: "emerald",
            },
            {
                label: "Cancelled",
                value: String(cancelledCount),
                trend: "-6.1%",
                tone: "rose",
            },
        ];

        // ─── Recent bookings (shaped like your toBookingRow helper) ──────────
        const recentBookings = allBookings.map((b) => ({
            id: b._id,
            room:
                typeof b.room === "object" ? b.room?.name : b.room,
            title: b.title,
            host: b.bookedBy?.name || "Employee",
            date: b.date,
            time: `${b.startTime} - ${b.endTime}`,
            status: b.status,
            email: b.bookedBy?.email,
        }));

        // ─── Availability grid (optional, for a specific room + date) ────────
        let availability = [];
        if (availabilityRoomId) {
            const targetDate = availabilityDate || today;

            // Fetch room to get bufferTime
            const targetRoom = rooms.find(
                (r) => r._id.toString() === availabilityRoomId
            );
            const bufferTime = targetRoom?.bufferTime || 0;

            // All active slots for that room on that date
            const bookedSlots = await BookingSlot.find({
                room: availabilityRoomId,
                date: targetDate,
                status: "active",
            })
                .select("slotStart slotEnd")
                .lean();

            const bookedSet = new Set(bookedSlots.map((s) => s.slotStart));

            // Build 30-min grid from 09:00 to 18:00
            availability = buildSlotGrid("09:00", "18:00", 30, bookedSet, bufferTime);

            // Patch nextAvailable onto the matching room
            const firstFree = availability.find(
                (s) => s.available && !s.buffer
            );
            const roomEntry = roomsWithMeta.find(
                (r) => r._id.toString() === availabilityRoomId
            );
            if (roomEntry && firstFree) {
                roomEntry.nextAvailable = firstFree.start;
            }
        }

        // ─── Response ─────────────────────────────────────────────────────────
        return res.status(200).json({
            success: true,
            data: {
                rooms: roomsWithMeta,
                recentBookings,
                metrics,
                availability,        // [] if no availabilityRoomId supplied
                meta: {
                    fetchedAt: new Date().toISOString(),
                    today,
                },
            },
        });
    } catch (error) {
        console.error("[getDashboardData]", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard data",
            error: error.message,
        });
    }
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Generate a grid of 30-min slots between startTime and endTime.
 * Marks slots as unavailable if they appear in bookedSet.
 * Marks the slot immediately after a booked block as a buffer (if bufferTime > 0).
 */
function buildSlotGrid(startTime, endTime, intervalMins, bookedSet, bufferTime) {
    const slots = [];
    let cursor = parseTime(startTime);
    const end = parseTime(endTime);

    while (cursor < end) {
        const slotStart = formatTime(cursor);
        const slotEnd = formatTime(cursor + intervalMins);
        const isBooked = bookedSet.has(slotStart);

        slots.push({
            start: slotStart,
            end: slotEnd,
            available: !isBooked,
        });

        cursor += intervalMins;
    }

    // Mark buffer slots: first available slot(s) after a booked block
    if (bufferTime > 0) {
        const bufferSlots = Math.ceil(bufferTime / intervalMins);
        for (let i = 0; i < slots.length; i++) {
            if (!slots[i].available) {
                // Mark the next N slots as buffer if they're currently available
                for (let b = 1; b <= bufferSlots && i + b < slots.length; b++) {
                    if (slots[i + b].available) {
                        slots[i + b].buffer = true;
                    }
                }
            }
        }
    }

    return slots;
}

/** "09:30" → 570 (minutes since midnight) */
function parseTime(str) {
    if (typeof str === "number") return str;
    const [h, m] = str.split(":").map(Number);
    return h * 60 + m;
}

/** 570 → "09:30" */
function formatTime(mins) {
    const h = Math.floor(mins / 60)
        .toString()
        .padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
}

module.exports = { getDashboardData };