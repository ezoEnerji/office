import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Upload dizinini oluştur (başlangıçta)
const baseUploadDir = path.join(process.cwd(), 'uploads');
const avatarsDir = path.join(baseUploadDir, 'avatars');
const documentsDir = path.join(baseUploadDir, 'documents');
const generalDir = path.join(baseUploadDir, 'general');

[baseUploadDir, avatarsDir, documentsDir, generalDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('Dizin oluşturuldu:', dir);
    }
  } catch (err) {
    console.error('Dizin oluşturma hatası:', dir, err);
  }
});

// Multer configuration for general file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Dosya tipine göre klasör belirle
      const fileType = req.query.type || 'general';
      let uploadPath = generalDir;
      
      if (fileType === 'avatar') {
        uploadPath = avatarsDir;
      } else if (fileType === 'contract' || fileType === 'document') {
        uploadPath = documentsDir;
      }
      
      // Klasör yoksa oluştur
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      console.log('Yükleme dizini:', uploadPath);
      cb(null, uploadPath);
    } catch (err: any) {
      console.error('Destination hatası:', err);
      cb(err, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = uniqueSuffix + '-' + originalName;
      console.log('Dosya adı:', filename);
      cb(null, filename);
    } catch (err: any) {
      console.error('Filename hatası:', err);
      cb(err, '');
    }
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
  console.log('Upload isteği alındı, type:', req.query.type);
  
  upload.single('file')(req, res, (err: any) => {
    // Multer hata kontrolü
    if (err) {
      console.error('Upload hatası:', err.message, err.code, err.stack);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Dosya boyutu çok büyük (max 20MB)' });
        }
        return res.status(400).json({ error: `Yükleme hatası: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'Dosya yükleme hatası' });
    }
    
    try {
      if (!req.file) {
        console.error('Dosya bulunamadı - req.file yok');
        return res.status(400).json({ error: 'Dosya yüklenmedi veya desteklenmeyen format' });
      }
      
      console.log('Dosya bilgisi:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });
      
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
      
      console.log('Dosya başarıyla yüklendi:', { relativePath, fullUrl });
      
      res.json({ url: fullUrl, path: relativePath });
    } catch (error: any) {
      console.error('Dosya işleme hatası:', error.message, error.stack);
      res.status(500).json({ error: error.message || 'Sunucu hatası' });
    }
  });
});

export default router;

