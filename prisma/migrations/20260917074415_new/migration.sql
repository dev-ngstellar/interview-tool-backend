-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('FULLSCREEN_EXIT', 'TAB_SWITCH', 'WINDOW_BLUR', 'NAVIGATION_ATTEMPT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CONTEXT_MENU_ATTEMPT', 'SHORTCUT_ATTEMPT');

-- CreateTable
CREATE TABLE "student_otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "details" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_security_events" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "eventType" "SecurityEventType" NOT NULL,
    "violationNumber" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_otps_email_idx" ON "student_otps"("email");

-- CreateIndex
CREATE INDEX "assessment_security_events_attemptId_idx" ON "assessment_security_events"("attemptId");

-- CreateIndex
CREATE INDEX "assessment_security_events_eventType_idx" ON "assessment_security_events"("eventType");

-- CreateIndex
CREATE INDEX "assessment_security_events_createdAt_idx" ON "assessment_security_events"("createdAt");

-- AddForeignKey
ALTER TABLE "assessment_security_events" ADD CONSTRAINT "assessment_security_events_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
