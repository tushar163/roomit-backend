require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");

const Room = require("../models/Room");
const Booking = require("../models/Booking");
const BookingSlot = require("../models/BookingSlot");

const seedData = async () => {
    try {
        await connectDB();

        console.log("Cleaning old data...");

        await Room.deleteMany();
        await Booking.deleteMany();
        await BookingSlot.deleteMany();

        console.log("Creating rooms...");

        const rooms = await Room.insertMany([
            {
                name: "Ocean View",
                floor: "1st Floor",
                capacity: 8,
                bufferTime: 10,
            },
            {
                name: "Sky Lounge",
                floor: "2nd Floor",
                capacity: 12,
                bufferTime: 15,
            },
            {
                name: "Innovation Hub",
                floor: "3rd Floor",
                capacity: 20,
                bufferTime: 5,
            },
            {
                name: "Focus Room",
                floor: "Ground Floor",
                capacity: 4,
                bufferTime: 0,
            },
        ]);

        console.log("Rooms seeded");

        const room1 = rooms[0];
        const room2 = rooms[1];

        const today = new Date().toISOString().split("T")[0];

        console.log("Creating bookings...");

        // BOOKING 1
        const booking1 = await Booking.create({
            room: room1._id,
            date: today,
            startTime: "10:00",
            endTime: "11:00",
            title: "Team Standup",
            bookedBy: {
                name: "Tushar Singh",
                email: "tushar@gmail.com",
            },
        });

        // BOOKING 1 SLOTS
        await BookingSlot.insertMany([
            {
                room: room1._id,
                booking: booking1._id,
                date: today,
                slotStart: "10:00",
                slotEnd: "10:30",
            },
            {
                room: room1._id,
                booking: booking1._id,
                date: today,
                slotStart: "10:30",
                slotEnd: "11:00",
            },
        ]);

        // BOOKING 2
        const booking2 = await Booking.create({
            room: room2._id,
            date: today,
            startTime: "14:00",
            endTime: "15:30",
            title: "Client Meeting",
            bookedBy: {
                name: "Rahul Sharma",
                email: "rahul@gmail.com",
            },
        });

        // BOOKING 2 SLOTS
        await BookingSlot.insertMany([
            {
                room: room2._id,
                booking: booking2._id,
                date: today,
                slotStart: "14:00",
                slotEnd: "14:30",
            },
            {
                room: room2._id,
                booking: booking2._id,
                date: today,
                slotStart: "14:30",
                slotEnd: "15:00",
            },
            {
                room: room2._id,
                booking: booking2._id,
                date: today,
                slotStart: "15:00",
                slotEnd: "15:30",
            },
        ]);

        console.log("Bookings seeded");

        console.log("Seed completed successfully");

        process.exit();
    } catch (error) {
        console.error(error);

        process.exit(1);
    }
};

seedData();