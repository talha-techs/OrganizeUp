require("dotenv").config();
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const res = await db.collection("pdfs.files").updateMany({}, { $set: { "metadata.contentType": "application/pdf" } });
  console.log("Updated " + res.modifiedCount + " PDFs");
  process.exit(0);
}).catch(console.error);
