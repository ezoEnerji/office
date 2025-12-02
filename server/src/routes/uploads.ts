import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Multer configuration for general file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Dosya tipine göre klasör belirle
    const fileType = req.query.type || 'general';
    let uploadPath = 'uploads/';
    
    if (fileType === 'avatar') {
      uploadPath = 'uploads/avatars/';
    } else if (fileType === 'contract' || fileType === 'document') {
      uploadPath = 'uploads/documents/';
    } else {
      uploadPath = 'uploads/general/';
    }
    
    // Klasör yoksa oluştur
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + originalName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const fileType = req.query.type || 'general';
    
    // Avatar için sadece resim
    if (fileType === 'avatar') {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir'));
      }
    } else {
      // Diğer dosyalar için genel kontrol (PDF, DOC, DOCX, vb.)
      const allowedTypes = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|txt/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      if (extname) {
        cb(null, true);
      } else {
        cb(new Error('Desteklenmeyen dosya tipi'));
      }
    }
  }
});

// Upload file (general purpose)
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });
    
    const fileType = req.query.type || 'general';
    let fileUrl = '';
    
    if (fileType === 'avatar') {
      fileUrl = `/uploads/avatars/${req.file.filename}`;
    } else if (fileType === 'contract' || fileType === 'document') {
      fileUrl = `/uploads/documents/${req.file.filename}`;
    } else {
      fileUrl = `/uploads/general/${req.file.filename}`;
    }
    
    res.json({ url: fileUrl, path: fileUrl });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

