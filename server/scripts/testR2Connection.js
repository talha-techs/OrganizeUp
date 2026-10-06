require("dotenv").config();
const { ListBucketsCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { getR2Client, R2_CONFIG } = require("../config/r2");

async function testR2() {
  console.log("Testing Cloudflare R2 Connection...");
  console.log("Account ID:", R2_CONFIG.accountId ? "✅ Set" : "❌ Missing");
  console.log("Access Key ID:", R2_CONFIG.accessKeyId ? "✅ Set" : "❌ Missing");
  console.log("Secret Access Key:", R2_CONFIG.secretAccessKey ? "✅ Set" : "❌ Missing");
  console.log("Public Domain:", R2_CONFIG.publicDomain);
  console.log("Endpoint:", `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`);

  const client = getR2Client();
  if (!client) {
    console.error("❌ Failed to create R2 Client. Check credentials.");
    process.exit(1);
  }

  try {
    const listRes = await client.send(new ListBucketsCommand({}));
    console.log("\n✅ Successfully authenticated with Cloudflare R2!");
    console.log("Buckets found:");
    for (const b of listRes.Buckets || []) {
      console.log(` - ${b.Name} (Created: ${b.CreationDate})`);
    }

    // Check public bucket
    try {
      await client.send(new HeadBucketCommand({ Bucket: R2_CONFIG.publicBucket }));
      console.log(`✅ Public bucket "${R2_CONFIG.publicBucket}" is accessible.`);
    } catch (err) {
      console.warn(`⚠️ Public bucket "${R2_CONFIG.publicBucket}" error: ${err.message}`);
    }

    // Check private bucket
    try {
      await client.send(new HeadBucketCommand({ Bucket: R2_CONFIG.privateBucket }));
      console.log(`✅ Private bucket "${R2_CONFIG.privateBucket}" is accessible.`);
    } catch (err) {
      console.warn(`⚠️ Private bucket "${R2_CONFIG.privateBucket}" not found or not yet created: ${err.message}`);
    }
  } catch (err) {
    console.error("❌ R2 Authentication failed:", err.message);
  }
}

testR2();
