-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "avatar" BYTEA,
ADD COLUMN     "avatarType" TEXT,
ADD COLUMN     "avatarUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "showPhoto" BOOLEAN NOT NULL DEFAULT false;
