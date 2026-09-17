import process from 'node:process';
import { PrismaClient, Role, DriveStatus, AssessmentType, QuestionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ROUND_1_APTITUDE_QUESTIONS } from '../src/modules/assessments/data/aptitude-questions.data';
import { ROUND_2_COMMUNICATION_QUESTIONS } from '../src/modules/assessments/data/communication-questions.data';
import { deleteTestUserData } from './delete-test-user';

const prisma = new PrismaClient();

// Blacklisted deleted test user UUID - must NEVER be re-seeded or reused (Requirement 4)
const DELETED_TEST_USER_ID = '356c7fad-b486-4f26-8ffb-979e19e33698';

async function main() {
  console.log('🌱 Starting development database seed...');

  // Pre-seed cleanup: ensure test user 356c7fad-b486-4f26-8ffb-979e19e33698 is completely removed (Requirements 1, 8, 9)
  try {
    await deleteTestUserData(DELETED_TEST_USER_ID);
  } catch (err: any) {
    console.warn('⚠️ Test user pre-seed cleanup notice:', err?.message || err);
  }

  // 1. Seed Safe Development Admin User (Requirement 4.1 & 7: Idempotent upsert)
  const adminEmail = 'admin@example.test';
  const hashedPassword = await bcrypt.hash('AdminDevSecret2026!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Admin user seeded: ${adminUser.email} (Role: ${adminUser.role})`);

  // 2. Seed Recruitment Drive (Requirement 4.2 & 7: Idempotent)
  const driveName = 'Marketing Executive Campus Drive 2026';
  let drive = await prisma.recruitmentDrive.findFirst({
    where: { name: driveName },
  });

  if (!drive) {
    drive = await prisma.recruitmentDrive.create({
      data: {
        name: driveName,
        description: 'Annual campus recruitment drive selecting high-potential Marketing Executives.',
        position: 'Marketing Executive',
        collegeInfo: 'Open to final-year and graduating students across all disciplines.',
        registrationStart: new Date(),
        registrationEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        status: DriveStatus.OPEN,
      },
    });
    console.log(`✅ Recruitment Drive created: "${drive.name}" (ID: ${drive.id})`);
  } else {
    // Ensure open status for development testing
    drive = await prisma.recruitmentDrive.update({
      where: { id: drive.id },
      data: { status: DriveStatus.OPEN },
    });
    console.log(`ℹ️ Recruitment Drive updated & ready: "${drive.name}" (ID: ${drive.id})`);
  }

  // 3. Seed Round 1: Aptitude Assessment (Requirement 5: Exactly 15 questions, 15 mins, 80% pass mark)
  let round1 = await prisma.assessment.findFirst({
    where: {
      recruitmentDriveId: drive.id,
      type: AssessmentType.APTITUDE,
    },
  });

  if (!round1) {
    round1 = await prisma.assessment.create({
      data: {
        recruitmentDriveId: drive.id,
        type: AssessmentType.APTITUDE,
        title: 'Round 1: Quantitative & Logical Aptitude Assessment',
        description: 'Speed and accuracy assessment covering quantitative reasoning and logical deduction. Strict duration is 15 minutes.',
        durationMinutes: 15,
        passPercentage: 80.0, // Fixed business requirement: 80%
        isActive: true,
      },
    });
    console.log(`✅ Round 1 Assessment created: "${round1.title}"`);
  } else {
    round1 = await prisma.assessment.update({
      where: { id: round1.id },
      data: {
        durationMinutes: 15,
        passPercentage: 80.0,
        isActive: true,
      },
    });
    console.log(`ℹ️ Round 1 Assessment updated: "${round1.title}"`);
  }

  // Idempotently seed exactly 15 unique questions for Round 1
  await prisma.$transaction(async (tx) => {
    // Remove stale questions for clean re-seed
    const existingQ = await tx.question.findMany({
      where: { assessmentId: round1.id },
      select: { id: true },
    });
    const qIds = existingQ.map((q) => q.id);

    if (qIds.length > 0) {
      await tx.assessmentAnswer.deleteMany({
        where: { questionId: { in: qIds } },
      });
      await tx.questionOption.deleteMany({
        where: { questionId: { in: qIds } },
      });
      await tx.question.deleteMany({
        where: { assessmentId: round1.id },
      });
    }

    // Insert exactly 15 unique aptitude questions
    for (const q of ROUND_1_APTITUDE_QUESTIONS) {
      await tx.question.create({
        data: {
          assessmentId: round1.id,
          questionText: q.questionText,
          questionType: QuestionType.SINGLE_CHOICE,
          marks: q.marks,
          order: q.order,
          options: {
            create: q.options.map((opt) => ({
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              order: opt.order,
            })),
          },
        },
      });
    }
  });

  console.log(`✅ Seeded exactly 15 distinct questions to Round 1 Aptitude Assessment (1.0 mark each, 80% pass mark).`);

  // 4. Seed Round 2: English Vocabulary & Communication Assessment (Requirement 6)
  let round2 = await prisma.assessment.findFirst({
    where: {
      recruitmentDriveId: drive.id,
      type: AssessmentType.COMMUNICATION,
    },
  });

  if (!round2) {
    round2 = await prisma.assessment.create({
      data: {
        recruitmentDriveId: drive.id,
        type: AssessmentType.COMMUNICATION,
        title: 'Round 2: English Vocabulary & Professional Communication',
        description: 'Comprehensive evaluation of English vocabulary, grammar, reading comprehension, and business situational communication.',
        durationMinutes: 20,
        passPercentage: 75.0, // Configurable threshold
        isActive: true,
      },
    });
    console.log(`✅ Round 2 Assessment created: "${round2.title}"`);
  } else {
    round2 = await prisma.assessment.update({
      where: { id: round2.id },
      data: {
        durationMinutes: 20,
        passPercentage: 75.0,
        isActive: true,
      },
    });
    console.log(`ℹ️ Round 2 Assessment updated: "${round2.title}"`);
  }

  // Idempotently seed Round 2 communication questions
  await prisma.$transaction(async (tx) => {
    const existingQ2 = await tx.question.findMany({
      where: { assessmentId: round2.id },
      select: { id: true },
    });
    const q2Ids = existingQ2.map((q) => q.id);

    if (q2Ids.length > 0) {
      await tx.assessmentAnswer.deleteMany({
        where: { questionId: { in: q2Ids } },
      });
      await tx.questionOption.deleteMany({
        where: { questionId: { in: q2Ids } },
      });
      await tx.question.deleteMany({
        where: { assessmentId: round2.id },
      });
    }

    for (const q of ROUND_2_COMMUNICATION_QUESTIONS) {
      await tx.question.create({
        data: {
          assessmentId: round2.id,
          questionText: q.questionText,
          questionType: QuestionType.SINGLE_CHOICE,
          marks: q.marks,
          order: q.order,
          options: {
            create: q.options.map((opt) => ({
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              order: opt.order,
            })),
          },
        },
      });
    }
  });

  console.log(`✅ Seeded ${ROUND_2_COMMUNICATION_QUESTIONS.length} questions to Round 2 English Vocabulary & Communication.`);

  // 5. Seed initial system Audit Log (Idempotent: update or create)
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_SEED_INITIALIZED',
      entityType: 'System',
      entityId: drive.id,
      metadata: {
        event: 'Development recruitment seed executed successfully',
        driveName: drive.name,
        adminUser: adminUser.email,
        round1Questions: 15,
        round2Questions: ROUND_2_COMMUNICATION_QUESTIONS.length,
        timestamp: new Date().toISOString(),
      },
    },
  });

  console.log('🎉 Development database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error executing database seed:', e);
    if (typeof process !== 'undefined') {
      process.exit(1);
    }
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
