require("dotenv").config({ path: "server/.env" });
const mongoose = require("mongoose");
const Course = require("../models/Course");

async function removeLinkOnlyCourses() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  console.log("Connected to MongoDB Atlas.");

  // Find all seeded courses
  const seededCourses = await Course.find({ seedId: { $type: "string" } });
  console.log(`Found ${seededCourses.length} seeded courses.`);

  const toDelete = [];
  const toKeep = [];

  for (const c of seededCourses) {
    // Check if it has a real driveFolderId or files
    const hasDirectContent = (c.files && c.files.length > 0) || Boolean(c.driveFolderId);
    if (hasDirectContent) {
      toKeep.push(c);
    } else {
      toDelete.push(c._id);
      console.log(`  🗑️ Removing link-only course: [${c.seedId}] "${c.title}"`);
    }
  }

  if (toDelete.length > 0) {
    const res = await Course.deleteMany({ _id: { $in: toDelete } });
    console.log(`\nSuccessfully deleted ${res.deletedCount} empty link-only courses from Atlas.`);
  }

  const remainingAllCourses = await Course.countDocuments();
  const remainingUserCourses = await Course.countDocuments({ seedId: { $exists: false } });
  console.log(`\nTotal courses remaining in database: ${remainingAllCourses} (User courses: ${remainingUserCourses})`);

  await mongoose.disconnect();
  process.exit(0);
}

removeLinkOnlyCourses().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

