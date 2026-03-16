/*
  Warnings:

  - Added the required column `matterType` to the `Matter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference` to the `Matter` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Hearing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "court" TEXT,
    "notes" TEXT,
    "matterId" TEXT NOT NULL,
    CONSTRAINT "Hearing_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Matter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "matterType" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'INTAKE',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "progress_note" TEXT,
    "assignedTo" TEXT,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "Matter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Matter" ("clientId", "id", "status", "title") SELECT "clientId", "id", "status", "title" FROM "Matter";
DROP TABLE "Matter";
ALTER TABLE "new_Matter" RENAME TO "Matter";
CREATE UNIQUE INDEX "Matter_reference_key" ON "Matter"("reference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
