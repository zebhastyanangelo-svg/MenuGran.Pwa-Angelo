-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- AlterTable: status
ALTER TABLE "orders"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "order_status" USING "status"::"order_status",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable: paymentMethod
ALTER TABLE "orders"
  ALTER COLUMN "payment_method" DROP DEFAULT,
  ALTER COLUMN "payment_method" TYPE "payment_method" USING "payment_method"::"payment_method",
  ALTER COLUMN "payment_method" SET DEFAULT 'CASH';
