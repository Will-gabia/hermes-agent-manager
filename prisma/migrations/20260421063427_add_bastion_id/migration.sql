-- CreateTable
CREATE TABLE "BastionId" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "container_id" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BastionId_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "Container" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BastionId_container_id_key" ON "BastionId"("container_id");
