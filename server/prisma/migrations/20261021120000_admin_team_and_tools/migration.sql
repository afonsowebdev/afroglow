-- The admin team: names, roles and permissions, notification choice and a photo. Existing admins are owners.
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'STAFF');

ALTER TABLE "Admin" ADD COLUMN "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'OWNER',
ADD COLUMN "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "notifyNewBookings" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "avatar" BYTEA,
ADD COLUMN "avatarType" TEXT,
ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);

-- Removing a team member takes their iPhones' push tokens with them.
ALTER TABLE "PushToken" DROP CONSTRAINT "PushToken_adminId_fkey";
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Private photos of a client's hair
CREATE TABLE "CustomerPhoto" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPhoto_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomerPhoto_customerId_createdAt_idx" ON "CustomerPhoto"("customerId", "createdAt");
ALTER TABLE "CustomerPhoto" ADD CONSTRAINT "CustomerPhoto_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Days the studio is closed
CREATE TABLE "ClosedPeriod" (
    "id" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosedPeriod_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClosedPeriod_endDate_idx" ON "ClosedPeriod"("endDate");

-- Discounts
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "serviceId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Promotion_endsAt_idx" ON "Promotion"("endsAt");
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Messages sent to the clients
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Broadcast_createdAt_idx" ON "Broadcast"("createdAt");
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
