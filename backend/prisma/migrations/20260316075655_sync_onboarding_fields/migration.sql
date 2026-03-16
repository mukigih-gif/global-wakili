/*
  Warnings:

  - You are about to drop the `ClientLedger` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Hearing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Staff` table. If the table is not empty, all the data it contains will be lost.
  - The primary key for the `Client` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `kraPin` on the `Client` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Document` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `name` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Document` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Document` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `matterId` on the `Document` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Matter` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `assignedTo` on the `Matter` table. All the data in the column will be lost.
  - You are about to drop the column `matterType` on the `Matter` table. All the data in the column will be lost.
  - You are about to drop the column `progress_note` on the `Matter` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `Matter` table. All the data in the column will be lost.
  - You are about to alter the column `clientId` on the `Matter` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `id` on the `Matter` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `TimeEntry` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `minutes` on the `TimeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `staffId` on the `TimeEntry` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `TimeEntry` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `matterId` on the `TimeEntry` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Transaction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `account` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `clientLedgerId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `Transaction` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `id` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `fileName` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileUrl` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Matter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `advocateId` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `appliedRate` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalValue` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountType` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ClientLedger";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Hearing";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Staff";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ASSOCIATE',
    "status" TEXT NOT NULL DEFAULT 'ONBOARDING',
    "defaultRate" REAL NOT NULL DEFAULT 0.0
);

-- CreateTable
CREATE TABLE "Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "matterId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourtHearing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hearingDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "matterId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourtHearing_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0.0
);

-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "clientType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "contactPerson" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Client" ("email", "id", "name", "phone") SELECT "email", "id", "name", "phone" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");
CREATE TABLE "new_Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "efilingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "matterId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("id", "matterId") SELECT "id", "matterId" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE TABLE "new_Matter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "opposingParty" TEXT,
    "billingType" TEXT NOT NULL DEFAULT 'FIXED',
    "customRate" REAL,
    "caseNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "stage" TEXT NOT NULL DEFAULT 'INTAKE',
    "category" TEXT NOT NULL DEFAULT 'LITIGATION',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Matter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Matter" ("clientId", "id", "stage", "status", "title") SELECT "clientId", "id", "stage", "status", "title" FROM "Matter";
DROP TABLE "Matter";
ALTER TABLE "new_Matter" RENAME TO "Matter";
CREATE UNIQUE INDEX "Matter_caseNumber_key" ON "Matter"("caseNumber");
CREATE TABLE "new_TimeEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL,
    "startTime" DATETIME,
    "duration" REAL NOT NULL DEFAULT 0.0,
    "entryType" TEXT NOT NULL DEFAULT 'MANUAL',
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "appliedRate" REAL NOT NULL,
    "totalValue" REAL NOT NULL,
    "advocateId" INTEGER NOT NULL,
    "matterId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeEntry_advocateId_fkey" FOREIGN KEY ("advocateId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TimeEntry" ("id", "matterId") SELECT "id", "matterId" FROM "TimeEntry";
DROP TABLE "TimeEntry";
ALTER TABLE "new_TimeEntry" RENAME TO "TimeEntry";
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "category" TEXT,
    "matterId" INTEGER,
    CONSTRAINT "Transaction_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "description", "id", "type") SELECT "amount", "description", "id", "type" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_type_key" ON "Account"("type");
