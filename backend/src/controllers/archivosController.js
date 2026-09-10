import prisma from '../utils/dbClient.js';
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { saveUploadedFile } from '../utils/fileStorage.js';

// Configurar Google Drive API
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: 'inventario-bodega',
    private_key_id: null,
    private_key: null,
    client_email: null,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_secret: process.env.GOOGLE_CLIENT_SECRET
  },
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

// Obtener archivos de un producto
export const obtenerArchivosPorProducto = async (req, res) => {
  try {
    const { producto_id } = req.params;

    const archivos = await prisma.archivos.findMany({
      where: { producto_id },
      orderBy: { uploaded_at: 'desc' }
    });

    res.json({ success: true, archivos: archivos || [] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Subir archivo a Google Drive
export const subirArchivoADrive = async (req, res) => {
  try {
    const { producto_id } = req.params;
    const { buffer, originalname, mimetype } = req.file || {};

    if (!buffer) {
      return res.status(400).json({
        success: false,
        error: 'Archivo no recibido'
      });
    }

    let archivo;

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
      const stored = saveUploadedFile({ originalname, buffer }, `producto-${producto_id}`);
      archivo = await prisma.archivos.create({
        data: {
          id: uuidv4(),
          producto_id,
          nombre: originalname,
          mime_type: mimetype,
          drive_file_id: stored.filename,
          web_view_link: `http://localhost:${process.env.PORT || 3000}${stored.url}`,
          web_content_link: `http://localhost:${process.env.PORT || 3000}${stored.url}`,
          uploaded_at: new Date()
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Archivo guardado en almacenamiento local del backend',
        archivo
      });
    }

    // Crear archivo en Google Drive
    const fileMetadata = {
      name: `${producto_id}-${Date.now()}-${originalname}`,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      mimeType: mimetype
    };

    const media = {
      mimeType: mimetype,
      body: Readable.from(buffer)
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink'
    });

    const driveFile = response.data;

    archivo = await prisma.archivos.create({
      data: {
        id: uuidv4(),
        producto_id,
        nombre: originalname,
        mime_type: mimetype,
        drive_file_id: driveFile.id,
        web_view_link: driveFile.webViewLink,
        web_content_link: driveFile.webContentLink,
        uploaded_at: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Archivo subido a Google Drive',
      archivo
    });
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Eliminar archivo
export const eliminarArchivo = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener info del archivo
    const archivo = await prisma.archivos.findUnique({ where: { id } });

    if (!archivo) {
      return res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }

    // Eliminar de Google Drive
    try {
      await drive.files.delete({
        fileId: archivo.drive_file_id
      });
    } catch (driveError) {
      console.warn('Error deleting from Drive:', driveError.message);
      // Continuar aunque Google Drive falle
    }

    // Eliminar registro de la base de datos
    await prisma.archivos.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Archivo eliminado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener enlace descarga directo
export const obtenerEnlaceDescarga = async (req, res) => {
  try {
    const { id } = req.params;

    const archivo = await prisma.archivos.findUnique({ where: { id } });

    if (!archivo) {
      return res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }

    res.json({
      success: true,
      url: archivo.web_content_link,
      nombre: archivo.nombre
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
