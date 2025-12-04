import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { google } from 'googleapis';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Multer memory storage for Google Drive uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya tipi'));
    }
  }
});

// Google Drive API yapılandırması
const getDriveClient = () => {
  const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS || '{}');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  return google.drive({ version: 'v3', auth });
};

// Ana klasör ID'sini al veya oluştur
const getOrCreateRootFolder = async (drive: any, folderName: string): Promise<string> => {
  try {
    // Önce mevcut klasörü ara
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Klasör yoksa oluştur
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    return folder.data.id!;
  } catch (error: any) {
    console.error('Klasör oluşturma hatası:', error);
    throw new Error('Google Drive klasörü oluşturulamadı');
  }
};

// Alt klasör oluştur veya al
const getOrCreateSubFolder = async (drive: any, parentId: string, folderName: string): Promise<string> => {
  try {
    // Önce mevcut klasörü ara
    const response = await drive.files.list({
      q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Klasör yoksa oluştur
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    return folder.data.id!;
  } catch (error: any) {
    console.error('Alt klasör oluşturma hatası:', error);
    throw new Error('Google Drive alt klasörü oluşturulamadı');
  }
};

// Dosya yükle
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    const { category, projectId, projectCode, projectName, contractId, contractCode, contractName, transactionId, documentName } = req.body;

    if (!process.env.GOOGLE_DRIVE_CREDENTIALS) {
      return res.status(500).json({ error: 'Google Drive yapılandırması bulunamadı' });
    }

    const drive = getDriveClient();

    // Ana klasör yapısını oluştur
    const rootFolderName = process.env.GOOGLE_DRIVE_ROOT_FOLDER || 'EzoOffice';
    const rootFolderId = await getOrCreateRootFolder(drive, rootFolderName);

    let targetFolderId = rootFolderId;

    // Kategoriye göre klasör yapısı
    if (category === 'project' && projectId) {
      // Projeler/ProjeKodu_ProjeAdı/Finansal İşlemler/...
      const projectsFolderId = await getOrCreateSubFolder(drive, rootFolderId, 'Projeler');
      const projectFolderName = `${projectCode || 'PROJ-' + projectId}_${(projectName || 'Proje').replace(/[^a-zA-Z0-9]/g, '_')}`;
      const projectFolderId = await getOrCreateSubFolder(drive, projectsFolderId, projectFolderName);
      targetFolderId = await getOrCreateSubFolder(drive, projectFolderId, 'Finansal İşlemler');
    } else if (category === 'contract' && contractId) {
      // Sözleşmeler/SözleşmeKodu_SözleşmeAdı/...
      const contractsFolderId = await getOrCreateSubFolder(drive, rootFolderId, 'Sözleşmeler');
      const contractFolderName = `${contractCode || 'CNT-' + contractId}_${(contractName || 'Sözleşme').replace(/[^a-zA-Z0-9]/g, '_')}`;
      targetFolderId = await getOrCreateSubFolder(drive, contractsFolderId, contractFolderName);
    } else if (category === 'document') {
      // Dökümanlar/Kategori/...
      const documentsFolderId = await getOrCreateSubFolder(drive, rootFolderId, 'Dökümanlar');
      const documentCategory = documentName || 'Genel';
      targetFolderId = await getOrCreateSubFolder(drive, documentsFolderId, documentCategory);
    } else {
      // Genel klasör
      targetFolderId = await getOrCreateSubFolder(drive, rootFolderId, 'Genel');
    }

    // Dosya adını oluştur
    const timestamp = Date.now();
    const sanitizedFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;

    // Dosyayı Google Drive'a yükle
    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId]
    };

    const media = {
      mimeType: req.file.mimetype,
      body: req.file.buffer
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink'
    });

    // Dosyayı herkesle paylaş (public link için)
    await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    res.json({
      fileId: file.data.id,
      fileName: file.data.name,
      webViewLink: file.data.webViewLink,
      webContentLink: file.data.webContentLink,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${file.data.id}`
    });
  } catch (error: any) {
    console.error('Google Drive yükleme hatası:', error);
    res.status(500).json({ error: error.message || 'Dosya yüklenirken bir hata oluştu' });
  }
});

// Dosya sil
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    if (!process.env.GOOGLE_DRIVE_CREDENTIALS) {
      return res.status(500).json({ error: 'Google Drive yapılandırması bulunamadı' });
    }

    const drive = getDriveClient();
    await drive.files.delete({
      fileId: req.params.fileId
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Google Drive silme hatası:', error);
    res.status(500).json({ error: error.message || 'Dosya silinirken bir hata oluştu' });
  }
});

// Dosya bilgisi al
router.get('/:fileId', authenticateToken, async (req, res) => {
  try {
    if (!process.env.GOOGLE_DRIVE_CREDENTIALS) {
      return res.status(500).json({ error: 'Google Drive yapılandırması bulunamadı' });
    }

    const drive = getDriveClient();
    const file = await drive.files.get({
      fileId: req.params.fileId,
      fields: 'id, name, webViewLink, webContentLink, mimeType, size, createdTime'
    });

    res.json({
      fileId: file.data.id,
      fileName: file.data.name,
      webViewLink: file.data.webViewLink,
      webContentLink: file.data.webContentLink,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${file.data.id}`,
      mimeType: file.data.mimeType,
      size: file.data.size,
      createdTime: file.data.createdTime
    });
  } catch (error: any) {
    console.error('Google Drive dosya bilgisi hatası:', error);
    res.status(500).json({ error: error.message || 'Dosya bilgisi alınırken bir hata oluştu' });
  }
});

export default router;

