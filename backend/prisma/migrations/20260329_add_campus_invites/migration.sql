CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

CREATE TABLE "Invite" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "acceptedByUserId" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE INDEX "Invite_email_idx" ON "Invite"("email");
CREATE INDEX "Invite_campusId_idx" ON "Invite"("campusId");
CREATE INDEX "Invite_status_idx" ON "Invite"("status");

ALTER TABLE "Invite"
ADD CONSTRAINT "Invite_campusId_fkey"
FOREIGN KEY ("campusId") REFERENCES "Campus"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invite"
ADD CONSTRAINT "Invite_invitedByUserId_fkey"
FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invite"
ADD CONSTRAINT "Invite_acceptedByUserId_fkey"
FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
