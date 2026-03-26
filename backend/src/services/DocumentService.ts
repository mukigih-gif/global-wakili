import { PrismaClient, DocCategory } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

export class DocumentService {
  
  /**
   * 1. THE CHOICE: MANUAL UPLOAD
   * Accepts MS Office or PDFs. Rejects other formats for security.
   */
  async uploadDocument(file: Express.Multer.File, matterId: string, creatorId: string, category: DocCategory) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.docx', '.xlsx', '.pptx', '.pdf'];
    
    if (!allowedExtensions.includes(ext)) {
      throw new Error("Invalid Format: Only MS Office and PDF files are allowed.");
    }

    const matter = await prisma.matter.findUnique({
      where: { id: matterId },
      select: { clientId: true, branchId: true }
    });

    return await prisma.$transaction(async (tx) => {
      return await tx.document.create({
        data: {
          title: file.originalname,
          matterId,
          clientId: matter!.clientId,
          creatorId,
          category,
          versions: {
            create: {
              versionNumber: 1,
              fileUrl: `/storage/firm_data/${matterId}/${file.filename}`,
              fileSize: file.size,
              mimeType: file.mimetype,
              uploadedById: creatorId,
              changeLog: "Initial manual upload"
            }
          }
        },
        include: { versions: true }
      });
    });
  }

  /**
   * 2. THE CHOICE: ONLYOFFICE EDITOR SAVE
   * Triggered by the OnlyOffice Callback Handler
   */
  async processEditorSave(documentId: string, userId: string, fileBuffer: Buffer, downloadUrl: string) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });

    if (!doc) throw new Error("Document not found");

    const nextVersion = doc.currentVersion + 1;
    const newPath = `/storage/edits/${documentId}_v${nextVersion}.docx`;

    // Imagine file saving logic here (e.g., S3.upload or fs.writeFile)
    // await saveFile(newPath, fileBuffer);

    return await prisma.$transaction([
      prisma.document.update({
        where: { id: documentId },
        data: { currentVersion: nextVersion }
      }),
      prisma.documentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersion,
          fileUrl: newPath,
          fileSize: fileBuffer.length,
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          uploadedById: userId,
          changeLog: "Auto-saved via OnlyOffice Editor"
        }
      })
    ]);
  }

  /**
   * 3. TEMPLATE ENGINE
   * Spawns a new document from a pre-set firm template
   */
  async createFromTemplate(templateId: string, matterId: string, userId: string) {
    const template = await prisma.document.findUnique({
      where: { id: templateId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });

    const matter = await prisma.matter.findUnique({ where: { id: matterId } });

    return await prisma.document.create({
      data: {
        title: `Draft: ${template!.title}`,
        matterId,
        clientId: matter!.clientId,
        creatorId: userId,
        category: DocCategory.DRAFTS,
        versions: {
          create: {
            versionNumber: 1,
            fileUrl: template!.versions[0].fileUrl,
            fileSize: template!.versions[0].fileSize,
            mimeType: template!.versions[0].mimeType,
            uploadedById: userId,
            changeLog: `Cloned from Template: ${template!.title}`
          }
        }
      }
    });
  }
}