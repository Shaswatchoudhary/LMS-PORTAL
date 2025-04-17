require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth-routes/index");
const mediaRoutes = require("./routes/instructor-routes/media-routes");
const instructorCourseRoutes = require("./routes/instructor-routes/course-routes");
const studentViewCourseRoutes = require("./routes/student-routes/course-routes");
const studentViewOrderRoutes = require("./routes/student-routes/order-routes");
const studentCoursesRoutes = require("./routes/student-routes/student-courses-routes");
const studentCourseProgressRoutes = require("./routes/student-routes/course-progress-routes");

const app = express();
const PORT = process.env.PORT || 5011;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URI = process.env.CLIENT_URI || 'http://localhost:5173';

// Enable CORS for all routes with proper configuration
app.use(cors({
  origin: [CLIENT_URI, 'http://localhost:5173'], // Allow both environment variable and hardcoded frontend URL
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight request for 24 hours
}));

// Add CORS headers manually to ensure they're set on all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CLIENT_URI);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS method
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

app.use(express.json());

// Database connection with improved error handling
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB is connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit if database connection fails
  });

// Routes configuration
app.use("/auth", authRoutes);
app.use("/media", mediaRoutes);
app.use("/instructor/course", instructorCourseRoutes);
app.use("/student/course", studentViewCourseRoutes);
app.use("/student/order", studentViewOrderRoutes);
app.use("/student/courses-bought", studentCoursesRoutes);
app.use("/student/course-progress", studentCourseProgressRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.listen(PORT, () => {
  console.log(`Server is now running on port ${PORT}`);
  console.log(`CORS is configured to allow origin: ${CLIENT_URI}`);
});