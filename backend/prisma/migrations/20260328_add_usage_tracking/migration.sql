-- CreateTable Usage
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campusId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex Usage unique constraint
CREATE UNIQUE INDEX "Usage_campusId_feature_month_year_key" ON "Usage"("campusId", "feature", "month", "year");

-- CreateIndex Usage campus index
CREATE INDEX "Usage_campusId_idx" ON "Usage"("campusId");
