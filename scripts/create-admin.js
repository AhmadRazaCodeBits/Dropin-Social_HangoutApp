const fs = require('fs');
const path = require('path');
const bcrypt = require("bcryptjs");
const { MongoClient } = require('mongodb');

async function createAdmin() {
  // Manual env parsing
  const envPath = path.join(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error(".env.local not found");
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const uriMatch = envContent.match(/MONGODB_URI=(.*)/);
  const uri = uriMatch ? uriMatch[1].trim() : null;

  if (!uri) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const users = db.collection('users');

  const email = "admin@dropin.com";
  const password = "AdminPassword123!";
  const username = "admin";

  const existing = await users.findOne({ email });
  if (existing) {
    console.log(`User ${email} already exists. Updating to admin...`);
    await users.updateOne({ email }, { $set: { isAdmin: true } });
    console.log("Admin privileges granted.");
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await users.insertOne({
      email,
      username,
      displayName: "System Admin",
      isAdmin: true,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`Admin user created!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }

  await client.close();
}

createAdmin().catch(console.error);
