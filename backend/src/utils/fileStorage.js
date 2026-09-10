import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.resolve(__dirname, '../../uploads');

export const ensureUploadDir = () => {
  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
  }
  return uploadRoot;
};

export const saveUploadedFile = (file, prefix = 'upload') => {
  ensureUploadDir();

  const extension = path.extname(file.originalname || 'file.bin');
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`;
  const filePath = path.join(uploadRoot, filename);

  fs.writeFileSync(filePath, file.buffer);

  return {
    filename,
    path: filePath,
    url: `/uploads/${filename}`
  };
};

export const getPublicUploadUrl = (filename) => `/uploads/${filename}`;
