/**
 * Script to remove tools/tricks that have no files and no folders
 * ("No files yet - Import content from Google Drive to get started" where only a URL was linked)
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Tool = require("../models/Tool");

async function removeEmptyTools() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  console.log("Connected to MongoDB Atlas.");

  const allTools = await Tool.find({});
  console.log(`Found ${allTools.length} total tools in database.`);

  const toDelete = [];
  const toKeep = [];

  for (const t of allTools) {
    const hasFiles = Boolean(t.files && t.files.length > 0);
    const hasFolders = Boolean(t.folders && t.folders.length > 0);

    if (hasFiles || hasFolders) {
      toKeep.push(t);
    } else {
      toDelete.push(t._id);
      console.log(`  🗑️ Removing tool with no files: "${t.title}" [id: ${t._id}, seedId: ${t.seedId || 'none'}]`);
    }
  }

  if (toDelete.length > 0) {
    const res = await Tool.deleteMany({ _id: { $in: toDelete } });
    console.log(`\nSuccessfully deleted ${res.deletedCount} empty tools from MongoDB Atlas.`);
  } else {
    console.log("\nNo empty tools to delete.");
  }

  const remaining = await Tool.countDocuments();
  console.log(`Tools remaining in database: ${remaining}`);

  await mongoose.disconnect();
  process.exit(0);
}

removeEmptyTools().catch((err) => {
  console.error("Error removing tools:", err);
  process.exit(1);
});

