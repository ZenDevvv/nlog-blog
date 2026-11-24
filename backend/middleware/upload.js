import multer from "multer";
import { MAX_IMAGE_BYTES, validateImageFile } from "../cloudinary.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
    fields: 10,
    fieldSize: 100 * 1024,
  },
});

export function uploadCoverImage(req, res, next) {
  if (!req.is("multipart/form-data")) return next();

  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ message: "Image must be 5 MB or smaller" });
        }
        if (err.code === "LIMIT_FIELD_VALUE") {
          return res.status(413).json({ message: "Request field is too large (maximum 100 KB)" });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({ message: "Only one cover image is allowed per post" });
        }
        return res.status(400).json({ message: "Invalid image upload request" });
      }
      return next(err);
    }

    if (req.body && typeof req.body.tags === "string") {
      try {
        req.body.tags = JSON.parse(req.body.tags);
      } catch {
        return res.status(400).json({ message: "Tags must be a valid JSON array" });
      }
    }

    if (req.file) {
      const checked = validateImageFile(req.file);
      if (checked.error) {
        return res.status(400).json({ message: checked.error });
      }
      req.validatedImage = checked.value;
    }

    return next();
  });
}
