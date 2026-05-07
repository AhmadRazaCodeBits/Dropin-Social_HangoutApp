import mongoose from "mongoose"

// Source - https://stackoverflow.com/a/79874273
// Posted by Vin
// Retrieved 2026-04-29, License - CC BY-SA 4.0
try {
  require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
} catch (e) {
  // Fallback for environments where require is not defined
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

function createMongoConnectionError(err, uri) {
  const isSrvUri = typeof uri === "string" && uri.startsWith("mongodb+srv://")
  const message = isSrvUri
    ? "MongoDB connection failed while resolving the Atlas SRV record. Use a reachable MongoDB URI, or switch to a standard mongodb:// connection string if your DNS/VPN blocks SRV lookups."
    : "MongoDB connection failed. Make sure the MongoDB server is reachable at the configured mongodb:// URI."

  const connectionError = new Error(message)
  connectionError.code = "MONGO_CONNECTION_FAILED"
  connectionError.statusCode = 503
  connectionError.cause = err
  connectionError.mongoUri = uri
  return connectionError
}

export async function connectDB() {
  let MONGODB_URI = process.env.MONGODB_URI

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const connectToRemote = async () => {
      if (!MONGODB_URI) {
        throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
      }
      console.log("🔄 Connecting to MongoDB...")
      return mongoose.connect(MONGODB_URI, { 
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000 // Fail fast if connection is blocked
      })
    }

    cached.promise = connectToRemote()
  }

  try {
    cached.conn = await cached.promise
    if (cached.conn.connection.host && !cached.conn.connection.host.includes("127.0.0.1")) {
      console.log("✅ MongoDB Connected Successfully")
    }
    return cached.conn
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message)
    cached.promise = null
    throw createMongoConnectionError(err, MONGODB_URI)
  }
}
