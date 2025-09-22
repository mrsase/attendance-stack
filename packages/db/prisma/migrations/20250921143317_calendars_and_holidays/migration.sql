/*
  Warnings:

  - You are about to drop the column `label` on the `Holiday` table. All the data in the column will be lost.
  - Added the required column `name` to the `Holiday` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Holiday" DROP COLUMN "label",
ADD COLUMN     "isJalali" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "jalaliDate" TEXT,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."WorkCalendar" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tehran',
    "weekendDays" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CalendarRule" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMin" INTEGER,
    "endMin" INTEGER,
    "isOff" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CalendarRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CalendarAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CalendarAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkCalendar_orgId_name_key" ON "public"."WorkCalendar"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarRule_calendarId_weekday_key" ON "public"."CalendarRule"("calendarId", "weekday");

-- CreateIndex
CREATE INDEX "CalendarAssignment_userId_effectiveFrom_effectiveTo_idx" ON "public"."CalendarAssignment"("userId", "effectiveFrom", "effectiveTo");

-- AddForeignKey
ALTER TABLE "public"."WorkCalendar" ADD CONSTRAINT "WorkCalendar_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalendarRule" ADD CONSTRAINT "CalendarRule_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "public"."WorkCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalendarAssignment" ADD CONSTRAINT "CalendarAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalendarAssignment" ADD CONSTRAINT "CalendarAssignment_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "public"."WorkCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
