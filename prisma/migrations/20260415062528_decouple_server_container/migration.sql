-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Container" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "server_id" TEXT,
    "server_ip" TEXT,
    "server_port" INTEGER,
    "template_id" TEXT,
    "container_id" TEXT,
    "container_name" TEXT,
    "api_token" TEXT,
    "slug" TEXT NOT NULL,
    "domain_name" TEXT NOT NULL,
    "service_port" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Container_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "Server" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Container_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ContainerTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Container" ("api_token", "container_id", "container_name", "createdAt", "domain_name", "id", "server_id", "service_port", "slug", "status", "template_id", "updatedAt") SELECT "api_token", "container_id", "container_name", "createdAt", "domain_name", "id", "server_id", "service_port", "slug", "status", "template_id", "updatedAt" FROM "Container";
DROP TABLE "Container";
ALTER TABLE "new_Container" RENAME TO "Container";
CREATE UNIQUE INDEX "Container_slug_key" ON "Container"("slug");
CREATE UNIQUE INDEX "Container_domain_name_key" ON "Container"("domain_name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
