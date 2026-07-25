-- CreateEnum
CREATE TYPE "service_type" AS ENUM ('MESA', 'DELIVERY');

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "qr_code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "service_type" "service_type" NOT NULL DEFAULT 'MESA';
ALTER TABLE "orders" ADD COLUMN "table_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tables_restaurant_id_number_key" ON "tables"("restaurant_id", "number");

-- CreateIndex
CREATE INDEX "orders_restaurant_id_service_type_status_created_at_idx" ON "orders"("restaurant_id", "service_type", "status", "created_at");

-- CreateIndex
CREATE INDEX "orders_service_type_status_idx" ON "orders"("service_type", "status");

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
