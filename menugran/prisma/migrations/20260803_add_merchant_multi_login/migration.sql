-- AlterEnum
CREATE TYPE "UserRole_new" AS ENUM ('CLIENT', 'MERCHANT', 'OPERATOR', 'ADMIN', 'RIDER', 'SUPERADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CLIENT';
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "password" TEXT;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "owner_id" TEXT;

-- CreateIndex
CREATE INDEX "businesses_owner_id_idx" ON "businesses"("owner_id");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
