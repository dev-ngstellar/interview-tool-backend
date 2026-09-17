-- AlterTable
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "studentId" TEXT;

-- AlterTable to make fields nullable if not already
ALTER TABLE "students" ALTER COLUMN "collegeName" DROP NOT NULL;
ALTER TABLE "students" ALTER COLUMN "course" DROP NOT NULL;
ALTER TABLE "students" ALTER COLUMN "department" DROP NOT NULL;
ALTER TABLE "students" ALTER COLUMN "graduationYear" DROP NOT NULL;

-- DropIndex (if old non-unique index exists)
DROP INDEX IF EXISTS "students_studentId_idx";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "students_studentId_key" ON "students"("studentId");
