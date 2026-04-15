-- CreateTable
CREATE TABLE "Config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "base_domain" TEXT,
    "cloudflare_api_key" TEXT,
    "cloudflare_zone_id" TEXT,
    "target_cname" TEXT,
    "caddyfile_path" TEXT DEFAULT './config/Caddyfile'
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "remote_ip" TEXT NOT NULL,
    "api_token" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContainerTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "template_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "server_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "container_id" TEXT,
    "container_name" TEXT,
    "api_token" TEXT,
    "slug" TEXT NOT NULL,
    "domain_name" TEXT NOT NULL,
    "service_port" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Container_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Container_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ContainerTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "container_id" TEXT NOT NULL,
    "operation_type" TEXT NOT NULL,
    "current_step" TEXT,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" DATETIME,
    CONSTRAINT "Operation_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "Container" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ContainerTemplate_template_key_key" ON "ContainerTemplate"("template_key");

-- CreateIndex
CREATE UNIQUE INDEX "Container_slug_key" ON "Container"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Container_domain_name_key" ON "Container"("domain_name");
