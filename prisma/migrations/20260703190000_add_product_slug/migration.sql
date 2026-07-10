ALTER TABLE "Product" ADD COLUMN "slug" TEXT;

UPDATE "Product"
SET "slug" = trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')));

ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
