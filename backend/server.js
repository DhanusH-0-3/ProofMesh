
"use strict";

require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const { predictImage } = require("./predict");

const app = express();
const PORT = process.env.PORT || 3000;

const frontendPath = path.resolve(__dirname, "../frontend/public");

// Serve frontend files
app.use(express.static(frontendPath));

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});
app.get("/debug-home", (req, res) => {
  res.json({
    frontendPath,
    indexExists: require("fs").existsSync(
      path.join(frontendPath, "index.html")
    )
  });
});
// Image upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG and PNG images are allowed.")
      );
    }

    callback(null, true);
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ProofMesh API is running",
    detectionProvider: "Sightengine",
    version: "sightengine-v2"
  });
});

// Image analysis
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload an image."
      });
    }

    const result = await predictImage(
      req.file.buffer,
      req.file.mimetype
    );

    return res.json({
      success: true,
      detectionProvider: "Sightengine",
      fileName: req.file.originalname,
      fileSize: req.file.size,
      ...result
    });
  } catch (error) {
    console.error(
      "Image analysis failed:",
      error.response?.data || error.message
    );

    return res.status(502).json({
      success: false,
      error:
        error.response?.data?.error?.message ||
        error.message ||
        "Image analysis failed."
    });
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Request error:", error.message);

  const message =
    error.code === "LIMIT_FILE_SIZE"
      ? "Image must be smaller than 5 MB."
      : error.message || "An unexpected error occurred.";

  return res.status(400).json({
    success: false,
    error: message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`ProofMesh server running on port ${PORT}`);
  console.log(`Frontend directory: ${frontendPath}`);
});
