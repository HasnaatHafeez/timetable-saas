-- Add reset password fields to User
ALTER TABLE "User"
ADD COLUMN "resetPasswordToken" TEXT,
ADD COLUMN "resetPasswordExpiresAt" TIMESTAMP(3);

-- Index for token lookup during password reset
CREATE INDEX "User_resetPasswordToken_idx" ON "User"("resetPasswordToken");
