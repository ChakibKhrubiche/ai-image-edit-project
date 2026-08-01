-- AlterTable
ALTER TABLE "shopify_store" ADD COLUMN "brandingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "shopify_store" ADD COLUMN "brandName" TEXT;
