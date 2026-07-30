-- AlterTable
ALTER TABLE "shopify_store" ADD COLUMN "widgetAdded" BOOLEAN NOT NULL DEFAULT false;

-- Existing stores are assumed already onboarded (widget added before this feature),
-- so they are not gated and won't risk duplicate blocks. Only new installs start false.
UPDATE "shopify_store" SET "widgetAdded" = true;
