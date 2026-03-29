ALTER TABLE "User"
ADD COLUMN "activeCampusId" TEXT;

CREATE INDEX "User_activeCampusId_idx" ON "User"("activeCampusId");

ALTER TABLE "User"
ADD CONSTRAINT "User_activeCampusId_fkey"
FOREIGN KEY ("activeCampusId") REFERENCES "Campus"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserCampus" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserCampus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCampus_userId_campusId_key" ON "UserCampus"("userId", "campusId");
CREATE INDEX "UserCampus_userId_idx" ON "UserCampus"("userId");
CREATE INDEX "UserCampus_campusId_idx" ON "UserCampus"("campusId");

ALTER TABLE "UserCampus"
ADD CONSTRAINT "UserCampus_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCampus"
ADD CONSTRAINT "UserCampus_campusId_fkey"
FOREIGN KEY ("campusId") REFERENCES "Campus"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
