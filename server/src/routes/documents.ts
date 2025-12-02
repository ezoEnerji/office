import express from 'express';
import multer from 'multer';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpeg|jpg|png|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Geçersiz dosya tipi'));
    }
  }
});

// Get all documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, relatedId } = req.query;
    const where: any = {};
    if (category) where.category = category;
    if (relatedId) where.relatedId = relatedId;

    const documents = await prisma.document.findMany({
      where,
      include: { uploader: { include: { role: true } } },
      orderBy: { uploadDate: 'desc' }
    });
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get document by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { uploader: true }
    });
    if (!document) return res.status(404).json({ error: 'Döküman bulunamadı' });
    res.json(document);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload document
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });
    
    const userId = (req as any).user?.userId;
    const { name, category, relatedId } = req.body;
    
    const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const fileUrl = `/uploads/${req.file.filename}`;

    const document = await prisma.document.create({
      data: {
        name: name || req.file.originalname,
        type: req.file.mimetype.includes('pdf') ? 'pdf' : 
              req.file.mimetype.includes('image') ? 'image' :
              req.file.mimetype.includes('spreadsheet') ? 'spreadsheet' : 'other',
        size: fileSizeMB,
        uploaderId: userId,
        category: category || 'general',
        relatedId: relatedId || null,
        url: fileUrl
      }
    });
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get all files from uploads directory (including files not in database)
router.get('/all-files', authenticateToken, async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
    
    // Read all files from uploads directory (excluding avatars subdirectory)
    const files = await fs.readdir(uploadsDir).catch(() => []);
    const allFiles: string[] = [];
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.stat(filePath).catch(() => null);
      if (stats && stats.isFile()) {
        allFiles.push(file);
      }
    }
    
    // Also read files from avatars directory
    try {
      const avatarFiles = await fs.readdir(avatarsDir);
      for (const file of avatarFiles) {
        const filePath = path.join(avatarsDir, file);
        const stats = await fs.stat(filePath).catch(() => null);
        if (stats && stats.isFile()) {
          allFiles.push(`avatars/${file}`);
        }
      }
    } catch (err) {
      // avatars directory might not exist
    }
    
    const fileList = await Promise.all(
      allFiles.map(async (relativePath: string) => {
        const filePath = relativePath.startsWith('avatars/') 
          ? path.join(avatarsDir, relativePath.replace('avatars/', ''))
          : path.join(uploadsDir, relativePath);
        const stats = await fs.stat(filePath).catch(() => null);
        if (!stats || !stats.isFile()) return null;
        
        const filename = path.basename(relativePath);
        const ext = path.extname(filename).toLowerCase();
        const type = ext === '.pdf' ? 'pdf' : 
                     ['.jpg', '.jpeg', '.png', '.gif'].includes(ext) ? 'image' :
                     ['.xls', '.xlsx', '.csv'].includes(ext) ? 'spreadsheet' : 'other';
        
        const url = relativePath.startsWith('avatars/') 
          ? `/uploads/${relativePath}`
          : `/uploads/${relativePath}`;
        
        // Check if file exists in database
        const dbDoc = await prisma.document.findFirst({
          where: { url }
        });
        
        return {
          id: dbDoc?.id || `file_${relativePath}`,
          name: filename,
          type,
          size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
          uploadDate: stats.mtime.toISOString().split('T')[0],
          uploaderId: dbDoc?.uploaderId || null,
          category: dbDoc?.category || 'general',
          relatedId: dbDoc?.relatedId || null,
          url,
          inDatabase: !!dbDoc
        };
      })
    );
    
    res.json(fileList.filter(f => f !== null));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: 'Döküman bulunamadı' });
    
    // Delete file from filesystem
    const fs = require('fs').promises;
    const path = require('path');
    const filePath = path.join(process.cwd(), document.url);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Dosya silinirken hata:', err);
    }
    
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ message: 'Döküman silindi' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

