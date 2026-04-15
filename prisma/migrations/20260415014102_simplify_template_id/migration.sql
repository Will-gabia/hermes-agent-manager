/*
  Warnings:

  - You are about to drop the column `template_key` on the `ContainerTemplate` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContainerTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ContainerTemplate" ("createdAt", "description", "display_name", "enabled", "id", "metadata", "updatedAt") SELECT "createdAt", "description", "display_name", "enabled", "id", "metadata", "updatedAt" FROM "ContainerTemplate";
DROP TABLE "ContainerTemplate";
ALTER TABLE "new_ContainerTemplate" RENAME TO "ContainerTemplate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
