import fs from 'fs-extra';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_STORAGE_PATH = path.join(__dirname, '../../storage');

export class StorageService {
  /**
   * Generates the "Power House" pathing: /storage/{branchId}/{matterId}/
   */
  static async getMatterDirectory(matterId: string): Promise<string> {
    const matter = await prisma.matter.findUnique({
      where: { id: matterId },
      select: { branchId: true }
    });

    if (!matter) throw new Error("Matter not found");

    // Construct path: /storage/BRANCH_123/MATTER_456/
    const targetDir = path.join(BASE_STORAGE_PATH, matter.branchId, matterId);
    
    // Ensure directory exists (Recursive mkdir)
    await fs.ensureDir(targetDir);
    
    return targetDir;
  }

  /**
   * Saves a file into the Branch-Matter silo
   */
  static async uploadDocument(matterId: string, file: Express.Multer.File, category: string) {
    const dir = await this.getMatterDirectory(matterId);
    const filePath = path.join(dir, file.originalname);

    // 1. Move file to the branch-specific silo
    await fs.move(file.path, filePath, { overwrite: true });

    // 2. Register in DB for the Master Report to track (Versions/Size)
    return await prisma.document.create({
      data: {
        matterId,
        name: file.originalname,
        path: filePath, // Stores the /storage/{branchId}/{matterId} path
        category: category as any,
        size: file.size,
        currentVersion: 1
      }
    });
  }
}