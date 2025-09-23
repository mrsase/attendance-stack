/*
  Warnings:

  - You are about to drop the column `kind` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to alter the column `reason` on the `LeaveRequest` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - Added the required column `orgId` to the `LeaveRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `LeaveRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."LeaveType" AS ENUM ('HOURLY', 'DAILY');

-- DropIndex
DROP INDEX "public"."LeaveRequest_userId_startAt_endAt_idx";

-- AlterTable
ALTER TABLE "public"."LeaveRequest" DROP COLUMN "kind",
ADD COLUMN     "approverRole" TEXT,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decisionNote" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "orgId" TEXT NOT NULL,
ADD COLUMN     "type" "public"."LeaveType" NOT NULL,
ALTER COLUMN "reason" SET DATA TYPE VARCHAR(500);

-- DropEnum
DROP TYPE "public"."LeaveKind";

-- CreateIndex
CREATE INDEX "LeaveRequest_orgId_status_idx" ON "public"."LeaveRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_departmentId_status_idx" ON "public"."LeaveRequest"("departmentId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_createdAt_idx" ON "public"."LeaveRequest"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
