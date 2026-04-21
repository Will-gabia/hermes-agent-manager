/*
  Warnings:

  - You are about to drop the column `container_id` on the `BastionId` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "_BastionIdToContainer" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_BastionIdToContainer_A_fkey" FOREIGN KEY ("A") REFERENCES "BastionId" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_BastionIdToContainer_B_fkey" FOREIGN KEY ("B") REFERENCES "Container" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BastionId" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_BastionId" ("createdAt", "id", "updatedAt") SELECT "createdAt", "id", "updatedAt" FROM "BastionId";
DROP TABLE "BastionId";
ALTER TABLE "new_BastionId" RENAME TO "BastionId";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_BastionIdToContainer_AB_unique" ON "_BastionIdToContainer"("A", "B");

-- CreateIndex
CREATE INDEX "_BastionIdToContainer_B_index" ON "_BastionIdToContainer"("B");
