const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  uploadMediaToCloudinary,
  deleteMediaFromCloudinary,
} = require("../../helpers/cloudinary");

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Improved file filter with detailed logging
const fileFilter = (req, file, cb) => {
  console.log("Received file:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  // Check both mimetype and extension
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 
    'video/webm', 'video/x-matroska'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.log(`Rejected file: ${file.originalname} (${file.mimetype})`);
    cb(new Error(`File type not allowed: ${file.mimetype}. Only image (JPEG, PNG, GIF) and video (MP4, MOV, AVI, WEBM, MKV) files are allowed!`));
  }
};

// Configure multer with limits
const multerConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
};

// Clean up uploaded files after processing
const cleanupFiles = (files) => {
  if (!files) return;
  
  const filesToDelete = Array.isArray(files) ? files : [files];
  
  filesToDelete.forEach(file => {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.error(`Failed to delete temp file: ${file.path}`, err);
      });
    }
  });
};

// Upload single file with detailed request logging
router.post("/upload", (req, res) => {
  console.log("Upload request received");
  console.log("Headers:", req.headers);
  console.log("Content type:", req.headers['content-type']);
  
  // Debug the request body type
  console.log("Request body type:", typeof req.body);
  
  const upload = multer(multerConfig).single("file");
  
  upload(req, res, async (err) => {
    // Handle Multer errors
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      return res.status(400).json({ 
        success: false, 
        message: `Multer error: ${err.message}`,
        code: err.code
      });
    }
    
    // Handle other errors
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }

    // Check for file
    if (!req.file) {
      console.error("No file found in request");
      return res.status(400).json({ 
        success: false, 
        message: "No file uploaded. Make sure you're sending a file with field name 'file'"
      });
    }

    console.log("File received successfully:", {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    try {
      const result = await uploadMediaToCloudinary(req.file.path);
      console.log("Cloudinary upload successful");
      
      // Clean up the temporary file
      cleanupFiles(req.file);
      
      res.status(200).json({ 
        success: true, 
        data: result 
      });
    } catch (error) {
      // Clean up on error
      cleanupFiles(req.file);
      
      console.error("Cloudinary upload error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error uploading file to cloud storage", 
        error: error.message 
      });
    }
  });
});

// Similar improvements for bulk upload
router.post("/bulk-upload", (req, res) => {
  console.log("Bulk upload request received");
  console.log("Headers:", req.headers);
  
  const upload = multer(multerConfig).array("files", 10);
  
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      return res.status(400).json({ 
        success: false, 
        message: `Multer error: ${err.message}`,
        code: err.code
      });
    }
    
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }

    if (!req.files || req.files.length === 0) {
      console.error("No files found in request");
      return res.status(400).json({ 
        success: false, 
        message: "No files uploaded. Make sure you're sending files with field name 'files'"
      });
    }

    console.log(`Received ${req.files.length} files for bulk upload`);

    try {
      const uploadPromises = req.files.map(file => uploadMediaToCloudinary(file.path));
      const uploadResults = await Promise.all(uploadPromises);
      
      // Clean up all temporary files
      cleanupFiles(req.files);
      
      res.status(200).json({ 
        success: true, 
        message: `Successfully uploaded ${uploadResults.length} files`,
        data: uploadResults 
      });
    } catch (error) {
      // Clean up on error
      cleanupFiles(req.files);
      
      console.error("Bulk upload error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Bulk upload failed", 
        error: error.message 
      });
    }
  });
});

// Delete endpoint remains the same
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: "Asset ID is required" });
  }

  try {
    const result = await deleteMediaFromCloudinary(id);
    res.status(200).json({ 
      success: true, 
      message: "Asset deleted successfully", 
      data: result 
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting file", 
      error: error.message 
    });
  }
});

module.exports = router;