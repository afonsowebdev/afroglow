-- AlterTable
ALTER TABLE "PushToken" ADD COLUMN     "badge" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CustomerPushToken" ADD COLUMN     "badge" INTEGER NOT NULL DEFAULT 0;
