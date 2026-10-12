
require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");

const { predictImage } = require("./predict");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, "../frontend")));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype !== "image/jpeg" &&
      file.mimetype !== "image/png"
    ) {
      return cb(
        new Error("Only JPG and PNG images are allowed.")
      );
    }

    cb(null, true);
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ProofMesh API is running",
    detectionProvider: "Sightengine",
    version: "sightengine-v2"
  });
});

app.post(
  "/api/analyze",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Please upload an image."
        });
      }

      console.log("\n--- New image analysis ---");
      console.log("File:", req.file.originalname);
      console.log("Size:", req.file.size);
      console.log("Type:", req.file.mimetype);

      const result = await predictImage(
        req.file.buffer,
        req.file.mimetype
      );

      console.log("Sightengine result:", result);

      return res.json({
        success: true,
        detectionProvider: "Sightengine",
        fileName: req.file.originalname,
        fileSize: req.file.size,
        ...result
      });

    } catch (error) {
      const apiError = error.response?.data;

      console.error(
        "Analysis failed:",
        apiError || error.message
      );

      return res.status(502).json({
        success: false,
        error:
          apiError?.error?.message ||
          error.message ||
          "Image analysis failed."
      });
    }
  }
);

app.use((error, req, res, next) => {
  const message =
    error.code === "LIMIT_FILE_SIZE"
      ? "Image must be smaller than 5 MB."
      : error.message;

  return res.status(400).json({
    success: false,
    error: message
  });
});

const server = app.listen(PORT, () => {
  console.log("\n==============================");
  console.log(" PROOFMESH - SIGHTENGINE API");
  console.log("==============================");
  console.log(`Website: http://localhost:${PORT}`);
  console.log("Version: sightengine-v2");
  console.log("CNN model: DISABLED");
  console.log("API: Sightengine");
  console.log("==============================\n");
});

server.on("error", error => {
  console.error("Server failed:", error.message);
  process.exitCode = 1;
});
