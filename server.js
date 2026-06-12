require("dotenv").config();

const express = require("express");
const connectDB = require("./src/config/db");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const roomRoutes = require("./src/routes/roomRoutes");
const availabilityRoutes = require("./src/routes/availabilityRoutes");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

const app = express();

app.use(cors(
  {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }
));
app.use(express.json());
app.use(limiter);
connectDB();

app.use("/api/v1/room", roomRoutes);
app.use("/api/v1/availability", availabilityRoutes);



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});