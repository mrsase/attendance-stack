-- CreateEnum
CREATE TYPE "public"."CorrectionAction" AS ENUM ('ADD', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "public"."AttendanceCorrection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,
    "action" "public"."CorrectionAction" NOT NULL,
    "targetEventId" TEXT,
    "proposedType" "public"."AttendanceType",
    "proposedAt" TIMESTAMP(3),
    "proposedNote" VARCHAR(500),
    "status" "public"."LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approverId" TEXT,
    "approverRole" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceCorrection_orgId_status_idx" ON "public"."AttendanceCorrection"("orgId", "status");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_userId_createdAt_idx" ON "public"."AttendanceCorrection"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_targetEventId_fkey" FOREIGN KEY ("targetEventId") REFERENCES "public"."AttendanceEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
