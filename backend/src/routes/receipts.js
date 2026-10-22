const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticateToken } = require("../middleware/auth");
const { tenantContext } = require("../middleware/tenant");
const geminiService = require("../services/geminiService");
const APIResponse = require("../utils/apiResponse");

// Setup memory storage for uploaded receipts
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // limit to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  }
});

router.post(
  "/upload",
  authenticateToken,
  tenantContext,
  upload.single("receipt"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json(APIResponse.error("No file uploaded", "VALIDATION_ERROR"));
      }

      console.log(`[OCR] Scanning receipt for organization: ${req.organizationId}`);
      const ocrResult = await geminiService.extractReceiptData(
        req.file.buffer,
        req.file.mimetype
      );

      if (!ocrResult) {
        return res.status(422).json(
          APIResponse.error(
            "Receipt OCR is unavailable or could not be parsed. Please enter the transaction details manually.",
            "OCR_UNAVAILABLE"
          )
        );
      }

      return res.status(200).json(
        APIResponse.success(ocrResult, "Receipt processed successfully")
      );
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
