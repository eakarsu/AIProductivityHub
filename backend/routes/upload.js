const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|mp3|mp4|md|json/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('application/') || file.mimetype.startsWith('text/');

  if (extname || mimetype) {
    return cb(null, true);
  }
  cb(new Error('File type not allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

// Upload file
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await pool.query(
      `INSERT INTO files (user_id, filename, filepath, extension, size_bytes, current_folder, uploaded, original_name, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8) RETURNING *`,
      [
        req.user.id,
        req.file.filename,
        req.file.path,
        path.extname(req.file.originalname).slice(1),
        req.file.size,
        '/Uploads',
        req.file.originalname,
        req.file.mimetype
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload multiple files
router.post('/multiple', authMiddleware, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    for (const file of req.files) {
      const result = await pool.query(
        `INSERT INTO files (user_id, filename, filepath, extension, size_bytes, current_folder, uploaded, original_name, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8) RETURNING *`,
        [req.user.id, file.filename, file.path, path.extname(file.originalname).slice(1), file.size, '/Uploads', file.originalname, file.mimetype]
      );
      results.push(result.rows[0]);
    }

    res.status(201).json(results);
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
