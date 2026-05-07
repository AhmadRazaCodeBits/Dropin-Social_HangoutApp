const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
    envConfig.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
}

async function checkConnection() {
  loadEnv();
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ ERROR: MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  console.log("🔄 Testing MongoDB connection before starting Next.js...");
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Fail fast
    });
    console.log("✅ MongoDB Connected Successfully!\n");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ MongoDB Connection Failed on Startup!\n");
    console.error("Reason:", err.message);
    if (err.message.includes("querySrv")) {
      console.error("\n💡 FIX: Your DNS or VPN is blocking MongoDB SRV records.");
      console.error("Use a standard 'mongodb://' connection string in .env.local, or point MONGODB_URI at a reachable local MongoDB instance.");
      console.error("Example: mongodb://127.0.0.1:27017/dropin\n");
    } else if (err.message.includes("ECONNREFUSED")) {
      console.error("\n💡 FIX: MongoDB is not accepting connections at the configured host and port.");
      console.error("Start your local MongoDB server, or update MONGODB_URI to point at a reachable instance.\n");
    }
    process.exit(1); // Exiting with 1 prevents 'next dev' from starting
  }
}

checkConnection();
