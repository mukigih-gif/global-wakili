import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export type StoredFileMeta = {
  storagePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  sha256: string;
};

const UPLOAD_ROOT = path.resolve(process.cwd(), 'storage');

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function persistBufferFile(params: {
  tenantId: string;
  module: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<StoredFileMeta> {
  const extension = path.extname(params.originalName);
  const safeBaseName = path
    .basename(params.originalName, extension)
    .replace(/[^a-zA-Z0-9-_]/g, '_');

  const datePart = new Date().toISOString().slice(0, 10);
  const randomPart = crypto.randomUUID();
  const tenantDir = path.join(UPLOAD_ROOT, params.tenantId, params.module, datePart);

  await ensureDir(tenantDir);

  const finalFileName = `${safeBaseName}_${randomPart}${extension}`;
  const fullPath = path.join(tenantDir, finalFileName);

  await fs.writeFile(fullPath, params.buffer);

  const sha256 = crypto.createHash('sha256').update(params.buffer).digest('hex');

  return {
    storagePath: fullPath,
    fileName: finalFileName,
    mimeType: params.mimeType,
    size: params.buffer.length,
    sha256,
  };
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  try {
    await fs.unlink(storagePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}