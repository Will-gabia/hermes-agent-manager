-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "remote_ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 3000,
    "api_token" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Server" ("api_token", "createdAt", "id", "metadata", "remote_ip", "updatedAt") SELECT "api_token", "createdAt", "id", "metadata", "remote_ip", "updatedAt" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
