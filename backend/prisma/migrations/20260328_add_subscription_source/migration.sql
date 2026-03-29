-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('MANUAL', 'STRIPE');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "source" "SubscriptionSource" NOT NULL DEFAULT 'MANUAL';
