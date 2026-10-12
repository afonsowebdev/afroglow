-- Prices by length / parting per hairstyle, and hiding a hairstyle from booking
ALTER TABLE "Service" ADD COLUMN "pricing" JSONB;
ALTER TABLE "Service" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- The options chosen when booking, and the price they came to
ALTER TABLE "Booking" ADD COLUMN "optionLabel" TEXT;
ALTER TABLE "Booking" ADD COLUMN "priceCents" INTEGER;
