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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
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

// Upload file (general purpose) - with proper error handling
router.post('/', authenticateToken, (req, res) => {
  upload.single('file')(req, res, (err) => {
    // Multer hata kontrolü
    if (err instanceof multer.MulterError) {
      console.error('Multer hatası:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Dosya boyutu çok büyük (max 20MB)' });
      }
      return res.status(400).json({ error: `Yükleme hatası: ${err.message}` });
    } else if (err) {
      console.error('Dosya yükleme hatası:', err);
      return res.status(400).json({ error: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Dosya yüklenmedi' });
      }
      
      const fileType = req.query.type || 'general';
      let relativePath = '';
      
      if (fileType === 'avatar') {
        relativePath = `/uploads/avatars/${req.file.filename}`;
      } else if (fileType === 'contract' || fileType === 'document') {
        relativePath = `/uploads/documents/${req.file.filename}`;
      } else {
        relativePath = `/uploads/general/${req.file.filename}`;
      }
      
      // Tam URL oluştur (production için)
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3001';
      const fullUrl = `${protocol}://${host}${relativePath}`;
      
      console.log('Dosya yüklendi:', { relativePath, fullUrl, fileType, originalName: req.file.originalname });
      
      res.json({ url: fullUrl, path: relativePath });
    } catch (error: any) {
      console.error('Dosya işleme hatası:', error);
      res.status(400).json({ error: error.message });
    }
  });
});

export default router;

