const { S3Client } = require("@aws-sdk/client-s3");

let r2ClientInstance = null;
let hasLoggedConfigWarning = false;

/**
 * Check if Cloudflare R2 credentials and configuration are provided
 */
const isR2Configured = () => {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
};

/**
 * Get initialized S3Client for Cloudflare R2
 * Returns null if credentials are not configured (enables graceful fallback)
 */
const getR2Client = () => {
  if (r2ClientInstance) return r2ClientInstance;

  if (!isR2Configured()) {
    if (!hasLoggedConfigWarning) {
      console.warn(
        "⚠️ [R2 Storage] Cloudflare R2 credentials not fully configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY). Operating in GridFS compatibility mode."
      );
      hasLoggedConfigWarning = true;
    }
    return null;
  }

  const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  r2ClientInstance = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  console.log("☁️ [R2 Storage] Cloudflare R2 S3 client initialized successfully.");
  return r2ClientInstance;
};

const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || "",
  publicBucket: process.env.R2_PUBLIC_BUCKET_NAME || "organizeup-public",
  privateBucket: process.env.R2_PRIVATE_BUCKET_NAME || "organizeup-private",
  publicDomain: process.env.R2_PUBLIC_DOMAIN ? process.env.R2_PUBLIC_DOMAIN.replace(/\/+$/, "") : "",
};

module.exports = {
  getR2Client,
  isR2Configured,
  R2_CONFIG,
};
