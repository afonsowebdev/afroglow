-- CreateTable
CREATE TABLE "CustomerPushToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPushToken_token_key" ON "CustomerPushToken"("token");

-- CreateIndex
CREATE INDEX "CustomerPushToken_customerId_idx" ON "CustomerPushToken"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerPushToken" ADD CONSTRAINT "CustomerPushToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
