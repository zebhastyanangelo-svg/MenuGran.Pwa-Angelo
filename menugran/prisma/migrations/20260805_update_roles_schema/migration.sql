-- AlterEnum: renombrar UserRole -> Role con nuevos valores y mapear datos existentes
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MERCHANT', 'CUSTOMER', 'EMPLOYEE');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING (CASE "role"::text
  WHEN 'SUPERADMIN' THEN 'SUPER_ADMIN'
  WHEN 'CLIENT' THEN 'CUSTOMER'
  WHEN 'OPERATOR' THEN 'EMPLOYEE'
  WHEN 'RIDER' THEN 'EMPLOYEE'
  ELSE "role"::text
END)::"Role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
DROP TYPE "UserRole";
