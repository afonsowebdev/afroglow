-- Hairstyles customers marked as favourites
CREATE TABLE "FavouriteService" (
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavouriteService_pkey" PRIMARY KEY ("customerId","serviceId")
);

ALTER TABLE "FavouriteService" ADD CONSTRAINT "FavouriteService_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavouriteService" ADD CONSTRAINT "FavouriteService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
