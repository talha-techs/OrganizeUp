require("dotenv").config();
const mongoose = require("mongoose");

console.log("Testing MongoDB connection...");
console.log("URI prefix:", process.env.MONGO_URI?.substring(0, 40) + "...");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("SUCCESS: MongoDB connected!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FAILED:", err.message);
    process.exit(1);
  });
