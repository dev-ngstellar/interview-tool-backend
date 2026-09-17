import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Development-only safe cleanup function to delete candidate test data by email.
 * Refuses to execute in production.
 */
export async function deleteTestUserData(
  target: string = 'bharathvidhyasekar@gmail.com',
) {
  const env =
    (typeof process !== 'undefined' && process.env?.NODE_ENV) || 'development';

  if (env === 'production') {
    throw new Error(
      'Refusing to execute test user cleanup in PRODUCTION environment!',
    );
  }

  const isEmail = target.includes('@');
  const normalizedEmail = isEmail ? target.trim().toLowerCase() : '';

  console.log(
    `🔍 [Cleanup] Searching user by ${
      isEmail ? `email: ${normalizedEmail}` : `ID: ${target}`
    }`,
  );

  const user = await prisma.user.findFirst({
    where: isEmail ? { email: normalizedEmail } : { id: target },
    include: {
      student: {
        include: {
          applications: {
            include: {
              assessmentAttempts: {
                include: {
                  answers: true,
                  result: true,
                },
              },
              adminApprovals: true,
            },
          },
        },
      },
      adminApprovals: true,
      auditLogs: true,
    },
  });

  const searchTarget = isEmail ? normalizedEmail : target;

  if (!user) {
    const message = `Test user not found: ${searchTarget}`;
    console.log(`ℹ️ [Cleanup] ${message}`);
    return message;
  }

  const effectiveEmail = (user.email || normalizedEmail).trim().toLowerCase();

  const student = user.student;
  const applications = student?.applications || [];

  const appIds = applications.map((application) => application.id);

  const attempts = applications.flatMap(
    (application) => application.assessmentAttempts,
  );

  const attemptIds = attempts.map((attempt) => attempt.id);

  const answersCount = attempts.reduce(
    (count, attempt) => count + attempt.answers.length,
    0,
  );

  const resultsCount = attempts.filter(
    (attempt) => attempt.result !== null,
  ).length;

  const relatedApprovalIds = new Set<string>();

  for (const approval of user.adminApprovals || []) {
    relatedApprovalIds.add(approval.id);
  }

  for (const application of applications) {
    for (const approval of application.adminApprovals || []) {
      relatedApprovalIds.add(approval.id);
    }
  }

  const approvalsCount = relatedApprovalIds.size;

  const auditLogsCount = user.auditLogs?.length || 0;

  const studentOtpsCount = await prisma.studentOtp.count({
    where: {
      email: effectiveEmail,
    },
  });

  console.log('\n📋 [Cleanup] Identified records:');
  console.log(`   - User ID: ${user.id}`);
  console.log(`   - User email: ${user.email}`);
  console.log(`   - Student ID: ${student?.id || 'None'}`);
  console.log(`   - Applications: ${applications.length}`);
  console.log(`   - Assessment attempts: ${attempts.length}`);
  console.log(`   - Assessment answers: ${answersCount}`);
  console.log(`   - Assessment results: ${resultsCount}`);
  console.log(`   - Admin approvals: ${approvalsCount}`);
  console.log(`   - Audit logs: ${auditLogsCount}`);
  console.log(`   - Student OTPs: ${studentOtpsCount}`);

  await prisma.$transaction(async (tx) => {
    // 1. Assessment Answers
    if (attemptIds.length > 0) {
      const deletedAnswers = await tx.assessmentAnswer.deleteMany({
        where: {
          attemptId: {
            in: attemptIds,
          },
        },
      });

      console.log(
        `   🗑️ Deleted ${deletedAnswers.count} AssessmentAnswer records.`,
      );
    }

    // 2. Assessment Results
    if (attemptIds.length > 0) {
      const deletedResults = await tx.assessmentResult.deleteMany({
        where: {
          attemptId: {
            in: attemptIds,
          },
        },
      });

      console.log(
        `   🗑️ Deleted ${deletedResults.count} AssessmentResult records.`,
      );
    }

    // 3. Assessment Security Events
    // Uses a runtime-safe check because this model may not exist
    // in every version of the Prisma schema.
    const transactionClient = tx as any;

    if (
      attemptIds.length > 0 &&
      transactionClient.assessmentSecurityEvent
    ) {
      const deletedEvents =
        await transactionClient.assessmentSecurityEvent.deleteMany({
          where: {
            attemptId: {
              in: attemptIds,
            },
          },
        });

      console.log(
        `   🗑️ Deleted ${deletedEvents.count} AssessmentSecurityEvent records.`,
      );
    }

    // 4. Assessment Attempts
    if (attemptIds.length > 0) {
      const deletedAttempts = await tx.assessmentAttempt.deleteMany({
        where: {
          id: {
            in: attemptIds,
          },
        },
      });

      console.log(
        `   🗑️ Deleted ${deletedAttempts.count} AssessmentAttempt records.`,
      );
    }

    // 5. Admin Approvals
    const approvalWhere = {
      OR: [
        ...(appIds.length > 0
          ? [
              {
                applicationId: {
                  in: appIds,
                },
              },
            ]
          : []),
        {
          adminUserId: user.id,
        },
      ],
    };

    const deletedApprovals = await tx.adminApproval.deleteMany({
      where: approvalWhere,
    });

    console.log(
      `   🗑️ Deleted ${deletedApprovals.count} AdminApproval records.`,
    );

    // 6. Applications
    if (appIds.length > 0) {
      const deletedApplications = await tx.application.deleteMany({
        where: {
          id: {
            in: appIds,
          },
        },
      });

      console.log(
        `   🗑️ Deleted ${deletedApplications.count} Application records.`,
      );
    }

    // 7. Student
    if (student) {
      await tx.student.delete({
        where: {
          id: student.id,
        },
      });

      console.log(`   🗑️ Deleted Student record: ${student.id}`);
    }

    // 8. User Audit Logs
    const deletedLogs = await tx.auditLog.deleteMany({
      where: {
        userId: user.id,
      },
    });

    console.log(`   🗑️ Deleted ${deletedLogs.count} AuditLog records.`);

    // 9. Student OTPs
    const deletedOtps = await tx.studentOtp.deleteMany({
      where: {
        email: effectiveEmail,
      },
    });

    console.log(
      `   🗑️ Deleted ${deletedOtps.count} StudentOtp records.`,
    );

    // 10. User
    await tx.user.delete({
      where: {
        id: user.id,
      },
    });

    console.log(`   🗑️ Deleted User record: ${user.id}`);
  });

  // ============================================================
  // POST DELETE VERIFICATION
  // ============================================================

  console.log('\n🔍 [Cleanup] Verifying deletion...');

  const verifyUser = await prisma.user.findFirst({
    where: {
      email: effectiveEmail,
    },
  });

  const verifyStudent = student
    ? await prisma.student.findUnique({
        where: {
          id: student.id,
        },
      })
    : null;

  const verifyApplications =
    appIds.length > 0
      ? await prisma.application.count({
          where: {
            id: {
              in: appIds,
            },
          },
        })
      : 0;

  const verifyAttempts =
    attemptIds.length > 0
      ? await prisma.assessmentAttempt.count({
          where: {
            id: {
              in: attemptIds,
            },
          },
        })
      : 0;

  const verifyAnswers =
    attemptIds.length > 0
      ? await prisma.assessmentAnswer.count({
          where: {
            attemptId: {
              in: attemptIds,
            },
          },
        })
      : 0;

  const verifyResults =
    attemptIds.length > 0
      ? await prisma.assessmentResult.count({
          where: {
            attemptId: {
              in: attemptIds,
            },
          },
        })
      : 0;

  const verifyAuditLogs = await prisma.auditLog.count({
    where: {
      userId: user.id,
    },
  });

  const verifyApprovals = await prisma.adminApproval.count({
    where: {
      OR: [
        ...(appIds.length > 0
          ? [
              {
                applicationId: {
                  in: appIds,
                },
              },
            ]
          : []),
        {
          adminUserId: user.id,
        },
      ],
    },
  });

  const verifyOtps = await prisma.studentOtp.count({
    where: {
      email: effectiveEmail,
    },
  });

  if (
    verifyUser ||
    verifyStudent ||
    verifyApplications > 0 ||
    verifyAttempts > 0 ||
    verifyAnswers > 0 ||
    verifyResults > 0 ||
    verifyAuditLogs > 0 ||
    verifyApprovals > 0 ||
    verifyOtps > 0
  ) {
    throw new Error(
      `Cleanup verification FAILED: residual records found for ${effectiveEmail}`,
    );
  }

  // ============================================================
  // VERIFY SHARED DATA
  // ============================================================

  const sharedDrives = await prisma.recruitmentDrive.count();
  const sharedAssessments = await prisma.assessment.count();
  const sharedQuestions = await prisma.question.count();
  const sharedOptions = await prisma.questionOption.count();

  console.log('\nℹ️ [Cleanup] Shared recruitment data preserved:');
  console.log(`   - Recruitment Drives: ${sharedDrives}`);
  console.log(`   - Assessments: ${sharedAssessments}`);
  console.log(`   - Questions: ${sharedQuestions}`);
  console.log(`   - Question Options: ${sharedOptions}`);

  console.log('\n========================================');
  console.log('TEST USER CLEANUP COMPLETE');
  console.log('========================================');
  console.log(`Email: ${effectiveEmail}`);
  console.log('User: DELETED');
  console.log('Student: DELETED');
  console.log('Applications: 0');
  console.log('Assessment Attempts: 0');
  console.log('Assessment Answers: 0');
  console.log('Assessment Results: 0');
  console.log('Admin Approvals: 0');
  console.log('Audit Logs: 0');
  console.log('Student OTPs: 0');
  console.log('Shared recruitment data: PRESERVED');
  console.log('========================================\n');

  return {
    success: true,
    message: `Successfully deleted all data for user: ${effectiveEmail}`,
  };
}

async function run() {
  const targetEmail = 'bharathvidhyasekar@gmail.com';

  try {
    await deleteTestUserData(targetEmail);
  } catch (error) {
    console.error('❌ Error executing test user cleanup:', error);

    if (typeof process !== 'undefined') {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run();
}