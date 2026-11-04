-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tool" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "converterJobId" TEXT,
    "filename" TEXT,
    "mediaType" TEXT,
    "inputBytes" INTEGER,
    "outputBytes" INTEGER,
    "errorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "expiresAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_converterJobId_key" ON "Job"("converterJobId");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");
