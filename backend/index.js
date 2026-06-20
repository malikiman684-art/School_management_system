const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Routes = require("./routes/route.js");

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// Parse JSON bodies
app.use(express.json({ limit: "10mb" }));

// --- CORS Configuration ---
const allowedOrigin = [
  "https://school-management-system-dc9t.vercel.app",
  "http://localhost:3000"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigin.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Handle preflight requests and apply CORS middleware
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
// --- End CORS Configuration ---


// 🛠️ MONGODB CONNECTION MANAGER
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!process.env.MONGO_URL) {
    console.error("❌ Error: MONGO_URL is not defined in your environment variables.");
    throw new Error("MONGO_URL is missing");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
    };
    
    console.log("🔄 Opening fresh MongoDB connection pool...");
    
    cached.promise = mongoose.connect(process.env.MONGO_URL, opts)
      .then((mongooseInstance) => {
        console.log("✅ MongoDB connected successfully!");
        return mongooseInstance;
      })
      .catch((err) => {
        console.error("❌ Mongoose internal connection promise rejected:", err.message);
        cached.promise = null; 
        throw err;
      });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// 1️⃣ ADDED FOR VERCEL PRODUCTION: Re-verify database link on incoming requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: "Database connection failed internally" });
  }
});


// Root endpoint
app.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

// Mount your routes
app.use("/", Routes);

// Error handler (catches CORS and other errors)
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Forbidden: Origin not allowed" });
  }
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});

module.exports = app;

// If run directly (not on Vercel), start the server
if (require.main === module) {
  // 2️⃣ ADDED FOR LOCAL HOST: Trigger connection instantly on startup 
  connectDB(); 

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}