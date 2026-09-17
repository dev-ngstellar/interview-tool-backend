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

  // Idempotently seed/update exactly 15 unique questions for Round 1 in-place
  await prisma.$transaction(async (tx) => {
    // Upsert each of the 15 questions and their 4 options by order to preserve candidate attempt history
    for (const q of ROUND_1_APTITUDE_QUESTIONS) {
      let existingQuestion = await tx.question.findFirst({
        where: { assessmentId: round1.id, order: q.order },
        include: { options: { orderBy: { order: 'asc' } } },
      });

      if (existingQuestion) {
        // Update question in-place
        await tx.question.update({
          where: { id: existingQuestion.id },
          data: {
            questionText: q.questionText,
            questionType: QuestionType.SINGLE_CHOICE,
            marks: q.marks,
            isActive: true,
          },
        });

        // Update the 4 options in-place by order
        for (const opt of q.options) {
          const existingOpt = existingQuestion.options.find((o) => o.order === opt.order);
          if (existingOpt) {
            await tx.questionOption.update({
              where: { id: existingOpt.id },
              data: {
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
              },
            });
          } else {
            await tx.questionOption.create({
              data: {
                questionId: existingQuestion.id,
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
                order: opt.order,
              },
            });
          }
        }
      } else {
        // Create question if not exists
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
    }

    // Ensure any stale/duplicate questions with order > 15 are deactivated
    await tx.question.updateMany({
      where: {
        assessmentId: round1.id,
        order: { gt: 15 },
      },
      data: { isActive: false },
    });
  });

  console.log(`✅ Seeded/updated exactly 15 distinct questions in Round 1 Aptitude Assessment (1.0 mark each, 80% pass mark).`);

  // 4. Seed Round 2: English Communication & Verbal Ability Assessment (Requirement 6)
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
        title: 'Round 2 — English Communication & Verbal Ability',
        description: 'Comprehensive evaluation of English communication, grammar, vocabulary, reading comprehension, and professional business correspondence.',
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
        title: 'Round 2 — English Communication & Verbal Ability',
        durationMinutes: 20,
        passPercentage: round2.passPercentage ?? 75.0,
        isActive: true,
      },
    });
    console.log(`ℹ️ Round 2 Assessment updated: "${round2.title}"`);
  }

  // Idempotently seed/update Round 2 communication questions in-place
  await prisma.$transaction(async (tx) => {
    for (const q of ROUND_2_COMMUNICATION_QUESTIONS) {
      let existingQuestion = await tx.question.findFirst({
        where: { assessmentId: round2.id, order: q.order },
        include: { options: { orderBy: { order: 'asc' } } },
      });

      if (existingQuestion) {
        // Update question in-place
        await tx.question.update({
          where: { id: existingQuestion.id },
          data: {
            questionText: q.questionText,
            questionType: QuestionType.SINGLE_CHOICE,
            marks: q.marks,
            isActive: true,
          },
        });

        // Update the 4 options in-place by order
        for (const opt of q.options) {
          const existingOpt = existingQuestion.options.find((o) => o.order === opt.order);
          if (existingOpt) {
            await tx.questionOption.update({
              where: { id: existingOpt.id },
              data: {
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
              },
            });
          } else {
            await tx.questionOption.create({
              data: {
                questionId: existingQuestion.id,
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
                order: opt.order,
              },
            });
          }
        }
      } else {
        // Create question if not exists
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
    }

    // Ensure any stale/duplicate questions with order > 15 are deactivated
    await tx.question.updateMany({
      where: {
        assessmentId: round2.id,
        order: { gt: 15 },
      },
      data: { isActive: false },
    });
  });

  console.log(`✅ Seeded/updated ${ROUND_2_COMMUNICATION_QUESTIONS.length} questions in Round 2 English Communication & Verbal Ability.`);

  // 5. Seed sample development student (Idempotent with valid unique studentId: 112)
  const sampleStudentEmail = 'student@example.test';
  let sampleUser = await prisma.user.findUnique({
    where: { email: sampleStudentEmail },
    include: { student: true },
  });

  if (!sampleUser) {
    const studentHashedPassword = await bcrypt.hash('StudentDevSecret2026!', 10);
    sampleUser = await prisma.user.create({
      data: {
        email: sampleStudentEmail,
        passwordHash: studentHashedPassword,
        role: Role.STUDENT,
        isActive: true,
        student: {
          create: {
            studentId: '112',
            fullName: 'Sample Student Candidate',
            email: sampleStudentEmail,
            phone: '9876543210',
            collegeName: 'NG College of Engineering',
            course: 'B.Tech',
            department: 'Computer Science',
            graduationYear: 2025,
          },
        },
      },
      include: { student: true },
    });
    console.log(`✅ Sample development student seeded: ${sampleUser.email} (Student ID: 112)`);
  } else if (sampleUser.student && !sampleUser.student.studentId) {
    await prisma.student.update({
      where: { id: sampleUser.student.id },
      data: { studentId: '112' },
    });
    console.log(`ℹ️ Sample development student updated with Student ID: 112`);
  }

  // 6. Seed initial system Audit Log (Idempotent: update or create)
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
