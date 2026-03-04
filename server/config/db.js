const mongoose = require("mongoose");
const { initGridFS } = require("./gridfs");

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 8000, // short so fallback kicks in quickly
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  family: 4, // force IPv4 — avoids hotspot NAT/IPv6 issues
};

const connectDB = async () => {
  // Try the SRV URI first.
  // If DNS resolution fails (mobile hotspot / ISPs that block SRV/TXT lookups),
  // automatically fall back to MONGO_URI_DIRECT which uses plain A-record DNS.
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_URI_DIRECT;

  const tryConnect = async (uri, label) => {
    const conn = await mongoose.connect(uri, MONGO_OPTIONS);
    console.log(`MongoDB Connected [${label}]: ${conn.connection.host}`);
    initGridFS();
    return conn;
  };

  try {
    await tryConnect(primaryUri, "SRV");
  } catch (primaryErr) {
    const isDnsError =
      primaryErr.message.includes("ETIMEOUT") ||
      primaryErr.message.includes("ENOTFOUND") ||
      primaryErr.message.includes("querySrv") ||
      primaryErr.message.includes("queryTxt");

    if (isDnsError && fallbackUri) {
      console.warn("[DB] SRV DNS lookup failed → retrying with direct URI...");
      try {
        await tryConnect(fallbackUri, "DIRECT");
      } catch (fallbackErr) {
        console.error(
          `MongoDB Connection Error (direct): ${fallbackErr.message}`,
        );
        process.exit(1);
      }
    } else {
      console.error(`MongoDB Connection Error: ${primaryErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
