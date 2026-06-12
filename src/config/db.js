const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

module.exports = async function connectDB() {
    if (!MONGO_URI) {
        console.error("MONGO_URI is not defined in environment variables");
        process.exit(1);
    }
  try {
    await mongoose.connect(MONGO_URI);

    console.log("MongoDB connected");
  } catch (err) {
    console.error(err.message);

    process.exit(1);
  }
};