import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  AttemptStatus,
  ApplicationStatus,
  AssessmentType,
  DriveStatus,
  QuestionType,
} from "@prisma/client";
import { ROUND_1_APTITUDE_QUESTIONS } from "./data/aptitude-questions.data";
import { ROUND_2_COMMUNICATION_QUESTIONS } from "./data/communication-questions.data";

export interface CurrentAssessmentResponse {
  assessmentId: string;
  title: string;
  type: AssessmentType;
  position: string;
  driveName: string;
  durationMinutes: number;
  questionCount: number;
  passPercentage: number;
  totalMarks: number;
  eligible: boolean;
  alreadyCompleted: boolean;
  hasActiveAttempt: boolean;
  activeAttempt?: {
    attemptId: string;
    startedAt: string;
    expiresAt: string;
    durationMinutes: number;
    serverTime: string;
    status: AttemptStatus;
    result?: EvaluatedResultData | null;
  } | null;
  currentStatus: ApplicationStatus;
  message?: string;
  round1Status?: string;
  round1Score?: number | null;
  round1Percentage?: number | null;
  round2Eligible?: boolean;
  round2ApprovalStatus?: string;
  round2Status?: string;
  isOverridden?: boolean;
}

export interface FinalResultResponse {
  candidateName: string;
  email: string;
  driveName: string;
  position: string;
  round1: {
    totalQuestions: number;
    obtainedMarks: number;
    percentage: number;
    passed: boolean;
  } | null;
  round2: {
    totalQuestions: number;
    obtainedMarks: number;
    percentage: number;
    passed: boolean;
  } | null;
  finalStatus: ApplicationStatus;
  isQualified: boolean;
  completed: boolean;
  completedAt?: string;
  isOverridden?: boolean;
}

export interface EvaluatedResultData {
  totalQuestions: number;
  correctAnswers: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  passed: boolean;
}

export interface StartAttemptResult {
  attemptId: string;
  startedAt: string;
  expiresAt: string;
  durationMinutes: number;
  serverTime: string;
  status: AttemptStatus;
  isExpired?: boolean;
  result?: EvaluatedResultData | null;
  securityViolationCount?: number;
}

export interface ActiveAttemptResult {
  hasActiveAttempt: boolean;
  attempt?: StartAttemptResult;
  serverTime: string;
}

export interface SafeOption {
  id: string;
  optionText: string;
  order: number;
}

export interface SafeQuestion {
  id: string;
  questionText: string;
  type?: string;
  marks: number;
  order: number;
  options: SafeOption[];
}

export interface AttemptQuestionsResponse {
  attemptId: string;
  status: AttemptStatus;
  startedAt: string;
  expiresAt?: string;
  durationMinutes: number;
  serverTime: string;
  questions: SafeQuestion[];
  savedAnswers: { questionId: string; selectedOptionId: string | null; isFinalized?: boolean }[];
  isExpired: boolean;
  result: EvaluatedResultData | null;
  securityViolationCount?: number;
}

export interface SubmitAttemptResult {
  attemptId: string;
  status: AttemptStatus;
  submittedAt: string;
  isExpired: boolean;
  result: EvaluatedResultData;
  message: string;
}

export interface Round2AccessResponse {
  allowed: boolean;
  available: boolean;
  status: ApplicationStatus;
  candidateName: string;
  message: string;
  assessmentId?: string;
  durationMinutes?: number;
  passPercentage?: number;
  title?: string;
  type?: string;
  questionCount?: number;
  attempt?: StartAttemptResult;
  result?: EvaluatedResultData | null;
  round1Status?: string;
  round1Score?: number | null;
  round1Percentage?: number | null;
  round2Eligible?: boolean;
  round2ApprovalStatus?: string;
  round2Status?: string;
  isOverridden?: boolean;
}

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Central source of truth for candidate Round 2 eligibility.
   * Round 2 is accessible when:
   * A) Round 1 was automatically passed (score >= 80% or status APTITUDE_PASSED)
   * OR
   * B) Round 1 failed BUT Admin approved the candidate for Round 2 (AdminApproval or ADMIN_APPROVED status)
   * OR
   * C) Candidate is in any downstream Round 2 status (COMMUNICATION_PENDING, IN_PROGRESS, PASSED, QUALIFIED, FAILED)
   */
  checkRound2Eligibility(application: any): {
    eligible: boolean;
    isPassedR1: boolean;
    hasAdminApproval: boolean;
    round1Score: number | null;
    round1Total: number;
    round1Percentage: number | null;
    round1Status: string;
    approvalReason: string | null;
  } {
    // 1. Locate Round 1 attempt and evaluated result
    const r1Attempt = application.assessmentAttempts?.find(
      (a: any) => a.assessment?.type === AssessmentType.APTITUDE,
    );
    const r1Result = r1Attempt?.result;

    const round1Score = r1Result?.obtainedMarks ?? null;
    const round1Total = r1Result?.totalMarks ?? r1Result?.totalQuestions ?? 15;
    const round1Percentage = r1Result?.percentage ?? null;

    const isPassedR1 = Boolean(
      r1Result?.passed === true ||
      application.currentStatus === ApplicationStatus.APTITUDE_PASSED ||
      (round1Percentage !== null && round1Percentage >= 80),
    );

    const round1Status = isPassedR1
      ? "PASSED"
      : r1Result || application.currentStatus === ApplicationStatus.APTITUDE_FAILED
      ? "FAILED"
      : "PENDING";

    // 2. Check Admin Approval override records
    const hasAdminApproval = Boolean(
      application.currentStatus === ApplicationStatus.ADMIN_APPROVED ||
      application.adminApprovals?.some(
        (a: any) => a.newStatus === ApplicationStatus.ADMIN_APPROVED,
      ),
    );

    const approvalReason =
      application.adminApprovals?.[0]?.reason ?? null;

    // 3. Statuses that imply Round 2 has already been authorized
    const downstreamRound2Statuses: ApplicationStatus[] = [
      ApplicationStatus.COMMUNICATION_PENDING,
      ApplicationStatus.COMMUNICATION_IN_PROGRESS,
      ApplicationStatus.COMMUNICATION_PASSED,
      ApplicationStatus.QUALIFIED,
      ApplicationStatus.COMMUNICATION_FAILED,
    ];
    const isDownstream = downstreamRound2Statuses.includes(application.currentStatus);

    const eligible = isPassedR1 || hasAdminApproval || isDownstream;

    return {
      eligible,
      isPassedR1,
      hasAdminApproval,
      round1Score,
      round1Total,
      round1Percentage,
      round1Status,
      approvalReason,
    };
  }

  /**
   * Ensures the Round 1 Aptitude Assessment contains exactly 15 distinct questions.
   * Auto-repairs the question bank if less than 15 questions exist.
   */
  async ensureRound1Questions(assessmentId: string): Promise<void> {
    const existingCount = await this.prisma.question.count({
      where: { assessmentId, isActive: true },
    });

    if (existingCount === 15) {
      return;
    }

    this.logger.log(
      `Synchronizing Round 1 Aptitude Assessment (${assessmentId}) with exactly 15 distinct questions.`,
    );

    // Delete incomplete / duplicate question sets to ensure fresh 15 distinct questions
    await this.prisma.$transaction(async (tx) => {
      // Find existing questions
      const existingQuestions = await tx.question.findMany({
        where: { assessmentId },
        select: { id: true },
      });
      const qIds = existingQuestions.map((q) => q.id);

      if (qIds.length > 0) {
        await tx.assessmentAnswer.deleteMany({
          where: { questionId: { in: qIds } },
        });
        await tx.questionOption.deleteMany({
          where: { questionId: { in: qIds } },
        });
        await tx.question.deleteMany({
          where: { assessmentId },
        });
      }

      // Seed exactly 15 distinct aptitude questions
      for (const q of ROUND_1_APTITUDE_QUESTIONS) {
        await tx.question.create({
          data: {
            assessmentId,
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

    this.logger.log(`Successfully seeded exactly 15 questions to assessment ${assessmentId}`);
  }

  /**
   * Ensures the Round 2 English Communication & Verbal Ability Assessment contains exactly 15 distinct questions.
   */
  async ensureRound2Questions(assessmentId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const q of ROUND_2_COMMUNICATION_QUESTIONS) {
        const existing = await tx.question.findFirst({
          where: { assessmentId, order: q.order },
          include: { options: { orderBy: { order: 'asc' } } },
        });

        if (existing) {
          await tx.question.update({
            where: { id: existing.id },
            data: {
              questionText: q.questionText,
              questionType: QuestionType.SINGLE_CHOICE,
              marks: q.marks,
              isActive: true,
            },
          });

          for (const opt of q.options) {
            const existingOpt = existing.options.find((o) => o.order === opt.order);
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
                  questionId: existing.id,
                  optionText: opt.optionText,
                  isCorrect: opt.isCorrect,
                  order: opt.order,
                },
              });
            }
          }
        } else {
          await tx.question.create({
            data: {
              assessmentId,
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

      await tx.question.updateMany({
        where: {
          assessmentId,
          order: { gt: 15 },
        },
        data: { isActive: false },
      });
    });

    this.logger.log(`Successfully verified and synchronized exactly 15 questions for Round 2 assessment ${assessmentId}`);
  }

  /**
   * Starts or retrieves an active assessment attempt.
   * Supports both Round 1 (APTITUDE) and Round 2 (COMMUNICATION).
   */
  async startAssessment(
    assessmentId: string,
    userId: string,
  ): Promise<StartAttemptResult> {
    this.logger.log(`[Assessment] Start request received`);
    this.logger.log(`[Assessment] Assessment ID: ${assessmentId}`);

    // 1. Authenticate student & resolve profile
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found for this account.");
    }
    this.logger.log(`[Assessment] Student authenticated: ${student.fullName}`);

    // 2. Validate assessment
    let assessment = null;
    const isSpecificId =
      assessmentId &&
      assessmentId !== "default" &&
      assessmentId !== "active" &&
      assessmentId !== "start";

    if (isSpecificId) {
      assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { recruitmentDrive: true },
      });

      if (!assessment) {
        throw new NotFoundException("Assessment not found.");
      }
    } else {
      assessment = await this.prisma.assessment.findFirst({
        where: {
          type: AssessmentType.APTITUDE,
          isActive: true,
          recruitmentDrive: {
            status: DriveStatus.OPEN,
          },
        },
        include: { recruitmentDrive: true },
      });

      if (!assessment) {
        throw new NotFoundException(
          "Round 1 Aptitude Assessment could not be found or is not currently active.",
        );
      }
    }

    if (!assessment.isActive) {
      throw new ForbiddenException("Assessment is not active.");
    }

    const isRound2 = assessment.type === AssessmentType.COMMUNICATION;

    // 3. Find candidate Application
    let application = await this.prisma.application.findUnique({
      where: {
        studentId_recruitmentDriveId: {
          studentId: student.id,
          recruitmentDriveId: assessment.recruitmentDriveId,
        },
      },
      include: {
        adminApprovals: { orderBy: { approvedAt: "desc" } },
        assessmentAttempts: {
          include: { assessment: true, result: true },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!application) {
      application = await this.prisma.application.findFirst({
        where: { studentId: student.id },
        include: {
          adminApprovals: { orderBy: { approvedAt: "desc" } },
          assessmentAttempts: {
            include: { assessment: true, result: true },
            orderBy: { startedAt: "desc" },
          },
        },
        orderBy: { appliedAt: "desc" },
      });
    }

    if (!application) {
      throw new BadRequestException(
        "Candidate application not found for this recruitment drive.",
      );
    }

    // 4. Candidate eligibility check
    if (isRound2) {
      const r2Eligibility = this.checkRound2Eligibility(application);
      if (!r2Eligibility.eligible) {
        throw new ForbiddenException(
          "Candidate must pass Round 1 or have Admin approval before attempting Round 2.",
        );
      }
    }

    // 5. Ensure question bank has exactly 15 questions
    if (isRound2) {
      await this.ensureRound2Questions(assessment.id);
    } else {
      await this.ensureRound1Questions(assessment.id);
    }

    const questionCount = await this.prisma.question.count({
      where: { assessmentId: assessment.id, isActive: true },
    });
    if (questionCount !== 15) {
      throw new BadRequestException(
        `Assessment configuration error: Expected 15 active questions, but found ${questionCount}.`,
      );
    }

    const now = new Date();

    // 6. Check existing attempt
    const existingAttempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        applicationId: application.id,
        assessmentId: assessment.id,
      },
      include: {
        result: true,
      },
      orderBy: { startedAt: "desc" },
    });

    if (existingAttempt) {
      const completedStatuses: AttemptStatus[] = [
        AttemptStatus.SUBMITTED,
        AttemptStatus.EVALUATED,
      ];
      if (completedStatuses.includes(existingAttempt.status) || existingAttempt.result) {
        this.logger.log(`[Assessment] Existing attempt found (Completed)`);
        return {
          attemptId: existingAttempt.id,
          startedAt: existingAttempt.startedAt.toISOString(),
          expiresAt:
            existingAttempt.expiresAt?.toISOString() || now.toISOString(),
          durationMinutes: assessment.durationMinutes || (isRound2 ? 20 : 15),
          serverTime: now.toISOString(),
          status: existingAttempt.status,
          isExpired: existingAttempt.status === AttemptStatus.EXPIRED,
          result: existingAttempt.result
            ? {
                totalQuestions: existingAttempt.result.totalQuestions,
                correctAnswers: existingAttempt.result.correctAnswers,
                totalMarks: existingAttempt.result.totalMarks,
                obtainedMarks: existingAttempt.result.obtainedMarks,
                percentage: existingAttempt.result.percentage,
                passed: existingAttempt.result.passed,
              }
            : null,
        };
      }

      if (existingAttempt.status === AttemptStatus.IN_PROGRESS) {
        const attemptExpiresAt =
          existingAttempt.expiresAt ||
          new Date(
            existingAttempt.startedAt.getTime() +
              (assessment.durationMinutes || (isRound2 ? 20 : 15)) * 60 * 1000,
          );

        this.logger.log(`[Assessment] Existing IN_PROGRESS attempt found`);
        this.logger.log(`[Assessment] Attempt ID: ${existingAttempt.id}`);
        this.logger.log(
          `[Assessment] Attempt expires at: ${attemptExpiresAt.toISOString()}`,
        );

        if (now >= attemptExpiresAt) {
          // Time expired -> auto evaluate
          const evalRes = await this.submitAttempt(existingAttempt.id, userId);
          return {
            attemptId: evalRes.attemptId,
            startedAt: existingAttempt.startedAt.toISOString(),
            expiresAt: attemptExpiresAt.toISOString(),
            durationMinutes: assessment.durationMinutes || (isRound2 ? 20 : 15),
            serverTime: now.toISOString(),
            status: evalRes.status,
            isExpired: true,
            result: evalRes.result,
          };
        }

        return {
          attemptId: existingAttempt.id,
          startedAt: existingAttempt.startedAt.toISOString(),
          expiresAt: attemptExpiresAt.toISOString(),
          durationMinutes: assessment.durationMinutes || (isRound2 ? 20 : 15),
          serverTime: now.toISOString(),
          status: existingAttempt.status,
          isExpired: false,
        };
      }
    }

    // Prevention of re-taking completed rounds
    if (!isRound2) {
      const completedR1Statuses: ApplicationStatus[] = [
        ApplicationStatus.APTITUDE_PASSED,
        ApplicationStatus.APTITUDE_FAILED,
        ApplicationStatus.ADMIN_APPROVED,
        ApplicationStatus.COMMUNICATION_PENDING,
        ApplicationStatus.COMMUNICATION_IN_PROGRESS,
        ApplicationStatus.COMMUNICATION_PASSED,
        ApplicationStatus.QUALIFIED,
        ApplicationStatus.COMMUNICATION_FAILED,
      ];
      const hasCompletedR1Attempt = application.assessmentAttempts?.some(
        (a: any) =>
          a.assessment?.type === AssessmentType.APTITUDE &&
          (a.status === AttemptStatus.SUBMITTED ||
            a.status === AttemptStatus.EVALUATED ||
            a.result),
      );

      if (completedR1Statuses.includes(application.currentStatus) || hasCompletedR1Attempt) {
        throw new ConflictException({
          statusCode: 409,
          code: "ASSESSMENT_ALREADY_COMPLETED",
          error: "Conflict",
          message: "Candidate has already completed Round 1. Another attempt is not permitted.",
        });
      }
    }

    if (isRound2) {
      const completedR2Statuses: ApplicationStatus[] = [
        ApplicationStatus.COMMUNICATION_FAILED,
        ApplicationStatus.QUALIFIED,
        ApplicationStatus.COMMUNICATION_PASSED,
      ];
      const hasCompletedR2Attempt = application.assessmentAttempts?.some(
        (a: any) =>
          a.assessment?.type === AssessmentType.COMMUNICATION &&
          (a.status === AttemptStatus.SUBMITTED ||
            a.status === AttemptStatus.EVALUATED ||
            a.result),
      );

      if (completedR2Statuses.includes(application.currentStatus) || hasCompletedR2Attempt) {
        throw new ConflictException({
          statusCode: 409,
          code: "ASSESSMENT_ALREADY_COMPLETED",
          error: "Conflict",
          message: "This candidate has already completed the recruitment assessment.",
        });
      }
    }

    // 7. Create fresh attempt with strict server expiration
    const durationMinutes = assessment.durationMinutes || (isRound2 ? 20 : 15);
    const startedAt = now;
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    const newAttempt = await this.prisma.$transaction(async (tx) => {
      // Concurrency guard: check if another request just created an IN_PROGRESS attempt
      const raceAttempt = await tx.assessmentAttempt.findFirst({
        where: {
          applicationId: application.id,
          assessmentId: assessment.id,
          status: AttemptStatus.IN_PROGRESS,
        },
        orderBy: { startedAt: "desc" },
      });

      if (raceAttempt) {
        return raceAttempt;
      }

      this.logger.log(`[Assessment] Creating new attempt for ${assessment.type}`);
      const attempt = await tx.assessmentAttempt.create({
        data: {
          assessmentId: assessment.id,
          applicationId: application.id,
          startedAt,
          expiresAt,
          status: AttemptStatus.IN_PROGRESS,
        },
      });

      this.logger.log(`[Assessment] Attempt ID: ${attempt.id}`);
      this.logger.log(`[Assessment] Attempt expires at: ${expiresAt.toISOString()}`);

      if (isRound2) {
        if (
          application.currentStatus !== ApplicationStatus.COMMUNICATION_IN_PROGRESS &&
          application.currentStatus !== ApplicationStatus.QUALIFIED
        ) {
          await tx.application.update({
            where: { id: application.id },
            data: { currentStatus: ApplicationStatus.COMMUNICATION_IN_PROGRESS },
          });
        }
      } else {
        if (application.currentStatus !== ApplicationStatus.APTITUDE_IN_PROGRESS) {
          await tx.application.update({
            where: { id: application.id },
            data: { currentStatus: ApplicationStatus.APTITUDE_IN_PROGRESS },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: isRound2
            ? "ASSESSMENT_ROUND_2_ATTEMPT_STARTED"
            : "ASSESSMENT_ATTEMPT_STARTED",
          entityType: "AssessmentAttempt",
          entityId: attempt.id,
          metadata: {
            assessmentId: assessment.id,
            applicationId: application.id,
            startedAt: startedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            durationMinutes,
          },
        },
      });

      return attempt;
    });

    return {
      attemptId: newAttempt.id,
      startedAt: newAttempt.startedAt.toISOString(),
      expiresAt: newAttempt.expiresAt?.toISOString() || expiresAt.toISOString(),
      durationMinutes,
      serverTime: now.toISOString(),
      status: newAttempt.status,
      isExpired: false,
    };
  }

  /**
   * Retrieves current assessment details and candidate eligibility without creating an attempt.
   * GET /api/assessments/current
   */
  async getCurrentAssessment(userId: string): Promise<CurrentAssessmentResponse> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found for this account.");
    }

    let application = await this.prisma.application.findFirst({
      where: { studentId: student.id },
      include: {
        recruitmentDrive: true,
        adminApprovals: { orderBy: { approvedAt: "desc" } },
        assessmentAttempts: {
          include: { assessment: true, result: true },
          orderBy: { startedAt: "desc" },
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    let recruitmentDrive = application?.recruitmentDrive ?? null;
    if (!recruitmentDrive) {
      recruitmentDrive = await this.prisma.recruitmentDrive.findFirst({
        where: { status: DriveStatus.OPEN },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!recruitmentDrive) {
      throw new NotFoundException("No active recruitment drive found.");
    }

    const assessment = await this.prisma.assessment.findFirst({
      where: {
        recruitmentDriveId: recruitmentDrive.id,
        type: AssessmentType.APTITUDE,
        isActive: true,
      },
      include: { recruitmentDrive: true },
    });

    if (!assessment) {
      throw new NotFoundException("Round 1 Aptitude Assessment could not be found or is not currently active.");
    }

    await this.ensureRound1Questions(assessment.id);
    const questionCount = await this.prisma.question.count({
      where: { assessmentId: assessment.id, isActive: true },
    });

    const currentStatus = application?.currentStatus || ApplicationStatus.REGISTERED;
    const r2Eligibility = application
      ? this.checkRound2Eligibility(application)
      : {
          eligible: false,
          isPassedR1: false,
          hasAdminApproval: false,
          round1Score: null,
          round1Total: 15,
          round1Percentage: null,
          round1Status: "PENDING",
          approvalReason: null,
        };

    let hasActiveAttempt = false;
    let activeAttemptInfo: any = null;
    const now = new Date();

    if (application) {
      const existingAttempt = await this.prisma.assessmentAttempt.findFirst({
        where: {
          applicationId: application.id,
          assessmentId: assessment.id,
        },
        include: { result: true },
        orderBy: { startedAt: "desc" },
      });

      if (existingAttempt) {
        if (existingAttempt.status === AttemptStatus.IN_PROGRESS) {
          const expiresAt =
            existingAttempt.expiresAt ||
            new Date(
              existingAttempt.startedAt.getTime() +
                (assessment.durationMinutes || 15) * 60 * 1000,
            );

          if (now >= expiresAt) {
            const evalRes = await this.submitAttempt(existingAttempt.id, userId);
            activeAttemptInfo = {
              attemptId: existingAttempt.id,
              startedAt: existingAttempt.startedAt.toISOString(),
              expiresAt: expiresAt.toISOString(),
              durationMinutes: assessment.durationMinutes || 15,
              serverTime: now.toISOString(),
              status: evalRes.status,
              result: evalRes.result,
            };
          } else {
            hasActiveAttempt = true;
            activeAttemptInfo = {
              attemptId: existingAttempt.id,
              startedAt: existingAttempt.startedAt.toISOString(),
              expiresAt: expiresAt.toISOString(),
              durationMinutes: assessment.durationMinutes || 15,
              serverTime: now.toISOString(),
              status: existingAttempt.status,
              result: null,
            };
          }
        } else {
          activeAttemptInfo = {
            attemptId: existingAttempt.id,
            startedAt: existingAttempt.startedAt.toISOString(),
            expiresAt: existingAttempt.expiresAt?.toISOString() || null,
            durationMinutes: assessment.durationMinutes || 15,
            serverTime: now.toISOString(),
            status: existingAttempt.status,
            result: existingAttempt.result
              ? {
                  totalQuestions: existingAttempt.result.totalQuestions,
                  correctAnswers: existingAttempt.result.correctAnswers,
                  totalMarks: existingAttempt.result.totalMarks,
                  obtainedMarks: existingAttempt.result.obtainedMarks,
                  percentage: existingAttempt.result.percentage,
                  passed: existingAttempt.result.passed,
                }
              : null,
          };
        }
      }
    }

    const hasEvaluatedR1Attempt = Boolean(
      activeAttemptInfo?.result ||
      activeAttemptInfo?.status === AttemptStatus.EVALUATED ||
      activeAttemptInfo?.status === AttemptStatus.SUBMITTED,
    );
    const completedR1Statuses: ApplicationStatus[] = [
      ApplicationStatus.APTITUDE_PASSED,
      ApplicationStatus.APTITUDE_FAILED,
      ApplicationStatus.ADMIN_APPROVED,
      ApplicationStatus.COMMUNICATION_PENDING,
      ApplicationStatus.COMMUNICATION_IN_PROGRESS,
      ApplicationStatus.COMMUNICATION_PASSED,
      ApplicationStatus.COMMUNICATION_FAILED,
      ApplicationStatus.QUALIFIED,
    ];
    const isRound1Completed =
      hasEvaluatedR1Attempt || completedR1Statuses.includes(currentStatus);

    return {
      assessmentId: assessment.id,
      title: assessment.title || "Round 1 — Aptitude Assessment",
      type: assessment.type,
      position: recruitmentDrive.position || "Marketing Executive",
      driveName: recruitmentDrive.name,
      durationMinutes: assessment.durationMinutes || 15,
      questionCount: questionCount || 15,
      passPercentage: assessment.passPercentage || 80,
      totalMarks: questionCount || 15,
      eligible: !isRound1Completed,
      alreadyCompleted: isRound1Completed,
      hasActiveAttempt,
      activeAttempt: activeAttemptInfo,
      currentStatus,
      message: isRound1Completed
        ? "This candidate has already completed Round 1."
        : undefined,
      round1Status: r2Eligibility.round1Status,
      round1Score: r2Eligibility.round1Score,
      round1Percentage: r2Eligibility.round1Percentage,
      round2Eligible: r2Eligibility.eligible,
      round2ApprovalStatus: r2Eligibility.hasAdminApproval
        ? "APPROVED"
        : r2Eligibility.isPassedR1
        ? "QUALIFIED"
        : "NONE",
      round2Status:
        application?.currentStatus === ApplicationStatus.ADMIN_APPROVED
          ? "PENDING"
          : application?.currentStatus === ApplicationStatus.COMMUNICATION_IN_PROGRESS
          ? "IN_PROGRESS"
          : application?.currentStatus === ApplicationStatus.QUALIFIED ||
            application?.currentStatus === ApplicationStatus.COMMUNICATION_PASSED
          ? "PASSED"
          : application?.currentStatus === ApplicationStatus.COMMUNICATION_FAILED
          ? "FAILED"
          : "PENDING",
      isOverridden: r2Eligibility.hasAdminApproval,
    };
  }

  /**
   * Retrieves active attempt for student session.
   */
  async getActiveAttempt(
    assessmentId: string,
    userId: string,
  ): Promise<ActiveAttemptResult> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    const now = new Date();

    if (!student) {
      return { hasActiveAttempt: false, serverTime: now.toISOString() };
    }

    const application = await this.prisma.application.findFirst({
      where: { studentId: student.id },
      orderBy: { appliedAt: "desc" },
    });

    if (!application) {
      return { hasActiveAttempt: false, serverTime: now.toISOString() };
    }

    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        applicationId: application.id,
        ...(assessmentId && assessmentId !== "default" && assessmentId !== "active" && assessmentId !== "active-attempt"
          ? { assessmentId }
          : {}),
      },
      include: { assessment: true, result: true },
      orderBy: { startedAt: "desc" },
    });

    if (!attempt) {
      return { hasActiveAttempt: false, serverTime: now.toISOString() };
    }

    let securityViolationCount = 0;
    try {
      if ((this.prisma as any).assessmentSecurityEvent) {
        securityViolationCount = await (this.prisma as any).assessmentSecurityEvent.count({
          where: {
            attemptId: attempt.id,
            eventType: {
              in: [
                "FULLSCREEN_EXIT",
                "TAB_SWITCH",
                "WINDOW_BLUR",
                "NAVIGATION_ATTEMPT",
              ],
            },
          },
        });
      }
    } catch {
      securityViolationCount = 0;
    }

    // Check expiration on IN_PROGRESS attempt
    if (
      attempt.status === AttemptStatus.IN_PROGRESS &&
      attempt.expiresAt &&
      now >= attempt.expiresAt
    ) {
      const evalRes = await this.submitAttempt(attempt.id, userId);
      return {
        hasActiveAttempt: false,
        attempt: {
          attemptId: evalRes.attemptId,
          startedAt: attempt.startedAt.toISOString(),
          expiresAt: attempt.expiresAt.toISOString(),
          durationMinutes: attempt.assessment?.durationMinutes || 15,
          serverTime: now.toISOString(),
          status: evalRes.status,
          isExpired: true,
          result: evalRes.result,
          securityViolationCount,
        },
        serverTime: now.toISOString(),
      };
    }

    return {
      hasActiveAttempt: attempt.status === AttemptStatus.IN_PROGRESS,
      attempt: {
        attemptId: attempt.id,
        startedAt: attempt.startedAt.toISOString(),
        expiresAt:
          attempt.expiresAt?.toISOString() ||
          new Date(
            attempt.startedAt.getTime() +
              (attempt.assessment?.durationMinutes || 15) * 60 * 1000,
          ).toISOString(),
        durationMinutes: attempt.assessment?.durationMinutes || 15,
        serverTime: now.toISOString(),
        status: attempt.status,
        isExpired: attempt.status === AttemptStatus.EXPIRED,
        securityViolationCount,
        result: attempt.result
          ? {
              totalQuestions: attempt.result.totalQuestions,
              correctAnswers: attempt.result.correctAnswers,
              totalMarks: attempt.result.totalMarks,
              obtainedMarks: attempt.result.obtainedMarks,
              percentage: attempt.result.percentage,
              passed: attempt.result.passed,
            }
          : null,
      },
      serverTime: now.toISOString(),
    };
  }

  /**
   * Retrieves exactly 15 questions for the candidate's active attempt.
   * NEVER exposes isCorrect to the frontend before evaluation.
   */
  async getAttemptQuestions(
    attemptId: string,
    userId: string,
  ): Promise<AttemptQuestionsResponse> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        application: true,
        assessment: true,
        result: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException("Assessment attempt not found.");
    }

    if (attempt.application.studentId !== student.id) {
      throw new ForbiddenException("Unauthorized access to this assessment attempt.");
    }

    // Ensure 15 questions exist for the appropriate round
    if (attempt.assessment?.type === AssessmentType.COMMUNICATION) {
      await this.ensureRound2Questions(attempt.assessmentId);
    } else {
      await this.ensureRound1Questions(attempt.assessmentId);
    }

    const now = new Date();
    let isExpired = false;

    if (
      attempt.status === AttemptStatus.IN_PROGRESS &&
      attempt.expiresAt &&
      now >= attempt.expiresAt
    ) {
      isExpired = true;
    }

    // Fetch safe questions (excluding isCorrect)
    const questions = await this.prisma.question.findMany({
      where: {
        assessmentId: attempt.assessmentId,
        isActive: true,
      },
      orderBy: { order: "asc" },
      take: 15,
      select: {
        id: true,
        questionText: true,
        questionType: true,
        marks: true,
        order: true,
        options: {
          select: {
            id: true,
            optionText: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    const safeQuestions: SafeQuestion[] = questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      type: q.questionType,
      marks: q.marks,
      order: q.order,
      options: q.options.map((opt) => ({
        id: opt.id,
        optionText: opt.optionText,
        order: opt.order,
      })),
    }));

    // Fetch previously saved candidate answers
    const savedAnswers = await this.prisma.assessmentAnswer.findMany({
      where: { attemptId },
      select: {
        questionId: true,
        selectedOptionId: true,
        textAnswer: true,
      },
    });

    const mappedSavedAnswers = savedAnswers.map((ans) => ({
      questionId: ans.questionId,
      selectedOptionId: ans.selectedOptionId,
      isFinalized: ans.textAnswer === "FINALIZED",
    }));

    let securityViolationCount = 0;
    try {
      if ((this.prisma as any).assessmentSecurityEvent) {
        securityViolationCount = await (this.prisma as any).assessmentSecurityEvent.count({
          where: {
            attemptId: attempt.id,
            eventType: {
              in: [
                "FULLSCREEN_EXIT",
                "TAB_SWITCH",
                "WINDOW_BLUR",
                "NAVIGATION_ATTEMPT",
              ],
            },
          },
        });
      }
    } catch {
      securityViolationCount = 0;
    }

    return {
      attemptId: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt?.toISOString(),
      durationMinutes: attempt.assessment?.durationMinutes || 15,
      serverTime: now.toISOString(),
      questions: safeQuestions,
      savedAnswers: mappedSavedAnswers,
      isExpired,
      securityViolationCount,
      result: attempt.result
        ? {
            totalQuestions: attempt.result.totalQuestions,
            correctAnswers: attempt.result.correctAnswers,
            totalMarks: attempt.result.totalMarks,
            obtainedMarks: attempt.result.obtainedMarks,
            percentage: attempt.result.percentage,
            passed: attempt.result.passed,
          }
        : null,
    };
  }

  /**
   * Persists an answer selected by the candidate.
   * Rejects answer modification if timer has expired.
   */
  async saveAnswer(
    attemptId: string,
    questionId: string,
    selectedOptionId: string,
    userId: string,
    isFinalized?: boolean,
  ) {
    if (!attemptId || typeof attemptId !== "string" || !attemptId.trim()) {
      throw new BadRequestException("attemptId is required.");
    }
    if (!questionId || typeof questionId !== "string" || !questionId.trim()) {
      throw new BadRequestException("questionId is required.");
    }
    if (!selectedOptionId || typeof selectedOptionId !== "string" || !selectedOptionId.trim()) {
      throw new BadRequestException("selectedOptionId is required.");
    }

    const cleanAttemptId = attemptId.trim();
    const cleanQuestionId = questionId.trim();
    const cleanOptionId = selectedOptionId.trim();

    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: cleanAttemptId },
      include: { application: true },
    });

    if (!attempt) {
      throw new NotFoundException("Assessment attempt not found.");
    }

    if (attempt.application.studentId !== student.id) {
      throw new ForbiddenException("Unauthorized access to this attempt.");
    }

    const now = new Date();

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Cannot save answers for an inactive or completed attempt.");
    }

    if (attempt.expiresAt && now >= attempt.expiresAt) {
      await this.prisma.assessmentAttempt.update({
        where: { id: cleanAttemptId },
        data: { status: AttemptStatus.EXPIRED, submittedAt: now },
      });
      throw new BadRequestException("Assessment duration has expired. Answers can no longer be updated.");
    }

    // Verify question belongs to this assessment attempt
    const question = await this.prisma.question.findFirst({
      where: {
        id: cleanQuestionId,
        assessmentId: attempt.assessmentId,
        isActive: true,
      },
    });

    if (!question) {
      throw new BadRequestException("Question does not belong to this assessment attempt.");
    }

    // Verify option belongs to question
    const option = await this.prisma.questionOption.findFirst({
      where: {
        id: cleanOptionId,
        questionId: question.id,
      },
    });

    if (!option) {
      throw new BadRequestException("Invalid option selected for this question.");
    }

    // Finalization Rule 1: Once marked as FINALIZED, answer cannot be modified.
    const existingAnswer = await this.prisma.assessmentAnswer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId: cleanAttemptId,
          questionId: question.id,
        },
      },
    });

    if (existingAnswer && existingAnswer.textAnswer === "FINALIZED") {
      if (existingAnswer.selectedOptionId === option.id) {
        return {
          success: true,
          questionId: existingAnswer.questionId,
          selectedOptionId: existingAnswer.selectedOptionId,
          isFinalized: true,
        };
      }
      throw new BadRequestException("This question answer is already finalized and locked. Answers cannot be modified.");
    }

    // Finalization Rule 2: Forward progression enforcement.
    // If ANY question with a strictly greater order in this assessment has an answer,
    // this question is in the past and permanently locked.
    const subsequentAnswer = await this.prisma.assessmentAnswer.findFirst({
      where: {
        attemptId: cleanAttemptId,
        question: {
          assessmentId: attempt.assessmentId,
          order: { gt: question.order },
        },
      },
    });

    if (subsequentAnswer) {
      if (existingAnswer && existingAnswer.selectedOptionId === option.id) {
        return {
          success: true,
          questionId: existingAnswer.questionId,
          selectedOptionId: existingAnswer.selectedOptionId,
          isFinalized: true,
        };
      }
      throw new BadRequestException("Previous questions are permanently locked and cannot be modified.");
    }

    // Current question: upsert the answer. Mark as FINALIZED only when isFinalized is true.
    const finalFlag = Boolean(isFinalized);
    const answer = await this.prisma.assessmentAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: cleanAttemptId,
          questionId: question.id,
        },
      },
      update: {
        selectedOptionId: option.id,
        answeredAt: now,
        textAnswer: finalFlag ? "FINALIZED" : "DRAFT",
      },
      create: {
        attemptId: cleanAttemptId,
        questionId: question.id,
        selectedOptionId: option.id,
        answeredAt: now,
        textAnswer: finalFlag ? "FINALIZED" : "DRAFT",
      },
    });

    return {
      success: true,
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      isFinalized: answer.textAnswer === "FINALIZED",
    };
  }

  /**
   * Submits and evaluates an assessment attempt.
   * Dynamically supports Round 1 (80% benchmark -> APTITUDE_PASSED / APTITUDE_FAILED)
   * and Round 2 (configured passPercentage, default 75% -> QUALIFIED / COMMUNICATION_FAILED).
   */
  async submitAttempt(
    attemptId: string,
    userId: string,
  ): Promise<SubmitAttemptResult> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        application: true,
        assessment: true,
        result: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException("Assessment attempt not found.");
    }

    if (attempt.application.studentId !== student.id) {
      throw new ForbiddenException("Unauthorized to submit this assessment attempt.");
    }

    const isRound2 = attempt.assessment?.type === AssessmentType.COMMUNICATION;
    const configuredPassPercentage = attempt.assessment?.passPercentage
      ? Number(attempt.assessment.passPercentage)
      : isRound2
      ? 75.0
      : 80.0;

    // Idempotent return if already evaluated
    if (attempt.result) {
      return {
        attemptId: attempt.id,
        status: attempt.status,
        submittedAt: attempt.submittedAt?.toISOString() || new Date().toISOString(),
        isExpired: attempt.status === AttemptStatus.EXPIRED,
        result: {
          totalQuestions: attempt.result.totalQuestions,
          correctAnswers: attempt.result.correctAnswers,
          totalMarks: attempt.result.totalMarks,
          obtainedMarks: attempt.result.obtainedMarks,
          percentage: attempt.result.percentage,
          passed: attempt.result.passed,
        },
        message: isRound2
          ? attempt.result.passed
            ? "Congratulations! You have successfully completed the Marketing Executive recruitment assessment."
            : "Thank you for participating. You have not met the minimum qualifying score for Round 2."
          : attempt.result.passed
          ? "Congratulations! You have qualified for Round 2."
          : "Assessment completed. You did not meet the 80% passing benchmark.",
      };
    }

    const now = new Date();
    const isExpired = attempt.expiresAt ? now >= attempt.expiresAt : false;

    // Fetch all 15 questions with options
    const questions = await this.prisma.question.findMany({
      where: { assessmentId: attempt.assessmentId, isActive: true },
      include: { options: true },
      orderBy: { order: "asc" },
      take: 15,
    });

    const savedAnswers = await this.prisma.assessmentAnswer.findMany({
      where: { attemptId },
    });

    const answerMap = new Map<string, string>();
    for (const a of savedAnswers) {
      if (a.selectedOptionId) {
        answerMap.set(a.questionId, a.selectedOptionId);
      }
    }

    let correctAnswers = 0;
    let obtainedMarks = 0;
    const totalQuestions = questions.length || 15;
    const totalMarks = totalQuestions * 1.0;

    for (const q of questions) {
      const selectedOptionId = answerMap.get(q.id);
      const correctOption = q.options.find((opt) => opt.isCorrect);
      const isCorrect = Boolean(
        selectedOptionId && correctOption && selectedOptionId === correctOption.id,
      );

      if (isCorrect) {
        correctAnswers += 1;
        obtainedMarks += q.marks || 1.0;
      }
    }

    const percentage = Math.round((obtainedMarks / totalMarks) * 10000) / 100;
    const passed = percentage >= configuredPassPercentage;

    const evaluation = await this.prisma.$transaction(async (tx) => {
      // Record evaluation marks on each answer
      for (const q of questions) {
        const selectedOptionId = answerMap.get(q.id);
        const correctOption = q.options.find((opt) => opt.isCorrect);
        const isCorrect = Boolean(
          selectedOptionId && correctOption && selectedOptionId === correctOption.id,
        );

        if (selectedOptionId) {
          await tx.assessmentAnswer.update({
            where: {
              attemptId_questionId: {
                attemptId,
                questionId: q.id,
              },
            },
            data: {
              isCorrect,
              marksAwarded: isCorrect ? (q.marks || 1.0) : 0,
            },
          });
        }
      }

      // Upsert AssessmentResult
      const res = await tx.assessmentResult.upsert({
        where: { attemptId },
        update: {
          totalQuestions,
          correctAnswers,
          totalMarks,
          obtainedMarks,
          percentage,
          passed,
          evaluatedAt: now,
        },
        create: {
          attemptId,
          totalQuestions,
          correctAnswers,
          totalMarks,
          obtainedMarks,
          percentage,
          passed,
          evaluatedAt: now,
        },
      });

      // Update attempt status
      await tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.EVALUATED,
          submittedAt: now,
        },
      });

      // Update Application Status (Round 1: APTITUDE_PASSED / APTITUDE_FAILED; Round 2: QUALIFIED / COMMUNICATION_FAILED)
      let newAppStatus: ApplicationStatus;
      if (isRound2) {
        newAppStatus = passed
          ? ApplicationStatus.QUALIFIED
          : ApplicationStatus.COMMUNICATION_FAILED;
      } else {
        newAppStatus = passed
          ? ApplicationStatus.APTITUDE_PASSED
          : ApplicationStatus.APTITUDE_FAILED;
      }

      await tx.application.update({
        where: { id: attempt.applicationId },
        data: { currentStatus: newAppStatus },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: isRound2
            ? "ASSESSMENT_ROUND_2_EVALUATED"
            : "ASSESSMENT_ROUND_1_EVALUATED",
          entityType: "AssessmentResult",
          entityId: res.id,
          metadata: {
            attemptId,
            obtainedMarks,
            totalMarks,
            percentage,
            passed,
            isExpired,
            applicationStatus: newAppStatus,
          },
        },
      });

      return res;
    });

    let message: string;
    if (isRound2) {
      message = passed
        ? "Congratulations! You have successfully completed the Marketing Executive recruitment assessment."
        : "Thank you for participating. You have not met the minimum qualifying score for Round 2.";
    } else {
      message = passed
        ? "Congratulations! You have qualified for Round 2."
        : "Assessment submitted. You did not meet the 80% passing benchmark for this round.";
    }

    return {
      attemptId,
      status: AttemptStatus.EVALUATED,
      submittedAt: now.toISOString(),
      isExpired,
      result: {
        totalQuestions: evaluation.totalQuestions,
        correctAnswers: evaluation.correctAnswers,
        totalMarks: evaluation.totalMarks,
        obtainedMarks: evaluation.obtainedMarks,
        percentage: evaluation.percentage,
        passed: evaluation.passed,
      },
      message,
    };
  }

  /**
   * Logs an anti-cheating / secure exam environment event for an active attempt.
   * Tracks violation counts server-side and automatically triggers evaluation submission
   * when the violation threshold (3 violations) is reached.
   */
  async logSecurityEvent(
    attemptId: string,
    rawEventType: string,
    userId: string,
    metadata?: any,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        application: true,
        assessment: true,
        result: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException("Assessment attempt not found.");
    }

    if (attempt.application.studentId !== student.id) {
      throw new ForbiddenException("Unauthorized access to this assessment attempt.");
    }

    // Normalizing event type
    const eventType = rawEventType.toUpperCase().trim();
    const isMajorViolation = [
      "FULLSCREEN_EXIT",
      "TAB_SWITCH",
      "WINDOW_BLUR",
      "NAVIGATION_ATTEMPT",
    ].includes(eventType);

    // If attempt is already submitted or evaluated, just return current status
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return {
        success: true,
        eventType,
        violationCount: 0,
        maxViolations: 3,
        shouldAutoSubmit: false,
        attemptStatus: attempt.status,
        message: "Attempt is already submitted or completed.",
      };
    }

    // Count existing major violations for this attempt
    let existingMajorViolations = 0;
    try {
      if ((this.prisma as any).assessmentSecurityEvent) {
        existingMajorViolations = await (this.prisma as any).assessmentSecurityEvent.count({
          where: {
            attemptId: attempt.id,
            eventType: {
              in: [
                "FULLSCREEN_EXIT",
                "TAB_SWITCH",
                "WINDOW_BLUR",
                "NAVIGATION_ATTEMPT",
              ],
            },
          },
        });
      }
    } catch (e) {
      this.logger.warn(`Could not count existing security events: ${e}`);
    }

    const currentViolationNumber = isMajorViolation
      ? existingMajorViolations + 1
      : existingMajorViolations;

    // Persist security event to database
    try {
      if ((this.prisma as any).assessmentSecurityEvent) {
        await (this.prisma as any).assessmentSecurityEvent.create({
          data: {
            attemptId: attempt.id,
            eventType: eventType as any,
            violationNumber: isMajorViolation ? currentViolationNumber : 0,
            metadata: metadata || {},
          },
        });
      }
    } catch (e) {
      this.logger.error(`Failed to create AssessmentSecurityEvent record: ${e}`);
    }

    // Record audit trail
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: `SECURITY_EVENT_${eventType}`,
          entityType: "AssessmentAttempt",
          entityId: attempt.id,
          metadata: {
            eventType,
            isMajorViolation,
            violationNumber: currentViolationNumber,
            applicationId: attempt.applicationId,
            driveId: attempt.application.recruitmentDriveId,
            ...(metadata || {}),
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Could not write audit log for security event: ${e}`);
    }

    this.logger.warn(
      `[Security Monitor] Attempt ${attempt.id} logged ${eventType} (Major: ${isMajorViolation}, Violation #${currentViolationNumber}/3)`,
    );

    // Violation threshold reached: automatic submission
    if (isMajorViolation && currentViolationNumber >= 3) {
      this.logger.warn(
        `[Security Monitor] Attempt ${attempt.id} reached maximum violations (${currentViolationNumber}/3). Triggering automatic submission.`,
      );
      const submitRes = await this.submitAttempt(attempt.id, userId);
      return {
        success: true,
        eventType,
        violationCount: currentViolationNumber,
        maxViolations: 3,
        shouldAutoSubmit: true,
        autoSubmitted: true,
        result: submitRes.result,
        message:
          "Assessment automatically submitted because the secure assessment environment was exited multiple times.",
      };
    }

    return {
      success: true,
      eventType,
      violationCount: currentViolationNumber,
      maxViolations: 3,
      shouldAutoSubmit: false,
      autoSubmitted: false,
      message: isMajorViolation
        ? `Security violation recorded (${currentViolationNumber}/3).`
        : `Security event logged: ${eventType}.`,
    };
  }

  /**
   * Retrieves 15 safe questions directly by assessmentId.
   */
  async getAssessmentQuestions(
    assessmentId: string,
    userId: string,
  ): Promise<AttemptQuestionsResponse> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    let targetAssessmentId = assessmentId;
    // Transparently handle if candidate attemptId was provided instead of assessmentId
    if (assessmentId && assessmentId !== "default" && assessmentId !== "active") {
      const attemptById = await this.prisma.assessmentAttempt.findUnique({
        where: { id: assessmentId },
        include: { application: true },
      });
      if (attemptById && attemptById.application.studentId === student.id) {
        return this.getAttemptQuestions(attemptById.id, userId);
      }
    }

    if (!assessmentId || assessmentId === "default" || assessmentId === "active") {
      const activeAssessment = await this.prisma.assessment.findFirst({
        where: { type: AssessmentType.APTITUDE, isActive: true },
      });
      if (!activeAssessment) {
        throw new NotFoundException("Active assessment not found.");
      }
      targetAssessmentId = activeAssessment.id;
    }

    const targetAssessment = await this.prisma.assessment.findUnique({
      where: { id: targetAssessmentId },
    });

    if (targetAssessment?.type === AssessmentType.COMMUNICATION) {
      await this.ensureRound2Questions(targetAssessmentId);
    } else {
      await this.ensureRound1Questions(targetAssessmentId);
    }

    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId: targetAssessmentId,
        application: { studentId: student.id },
      },
      include: { assessment: true, result: true },
      orderBy: { startedAt: "desc" },
    });

    const now = new Date();

    const questions = await this.prisma.question.findMany({
      where: {
        assessmentId: targetAssessmentId,
        isActive: true,
      },
      orderBy: { order: "asc" },
      take: 15,
      select: {
        id: true,
        questionText: true,
        marks: true,
        order: true,
        options: {
          select: {
            id: true,
            optionText: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    let savedAnswers: { questionId: string; selectedOptionId: string | null }[] = [];
    if (attempt) {
      savedAnswers = await this.prisma.assessmentAnswer.findMany({
        where: { attemptId: attempt.id },
        select: { questionId: true, selectedOptionId: true },
      });
    }

    return {
      attemptId: attempt?.id || "",
      status: attempt?.status || AttemptStatus.NOT_STARTED,
      startedAt: attempt?.startedAt?.toISOString() || now.toISOString(),
      expiresAt: attempt?.expiresAt?.toISOString(),
      durationMinutes: attempt?.assessment?.durationMinutes || 15,
      serverTime: now.toISOString(),
      questions,
      savedAnswers,
      isExpired: attempt?.status === AttemptStatus.EXPIRED,
      result: attempt?.result
        ? {
            totalQuestions: attempt.result.totalQuestions,
            correctAnswers: attempt.result.correctAnswers,
            totalMarks: attempt.result.totalMarks,
            obtainedMarks: attempt.result.obtainedMarks,
            percentage: attempt.result.percentage,
            passed: attempt.result.passed,
          }
        : null,
    };
  }

  /**
   * Retrieves the saved score card result for an attempt.
   */
  async getAttemptResult(attemptId: string, userId: string): Promise<SubmitAttemptResult> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        application: true,
        assessment: true,
        result: true,
      },
    });

    if (!attempt || !attempt.result) {
      throw new NotFoundException("Assessment result not found.");
    }

    if (attempt.application.studentId !== student.id) {
      throw new ForbiddenException("Unauthorized access to this assessment result.");
    }

    const isRound2 = attempt.assessment?.type === AssessmentType.COMMUNICATION;
    let message: string;
    if (isRound2) {
      message = attempt.result.passed
        ? "Congratulations! You have successfully completed the Marketing Executive recruitment assessment."
        : "Thank you for participating. You have not met the minimum qualifying score for Round 2.";
    } else {
      message = attempt.result.passed
        ? "Congratulations! You have qualified for Round 2."
        : "You did not meet the 80% passing benchmark for this round.";
    }

    return {
      attemptId: attempt.id,
      status: attempt.status,
      submittedAt: attempt.submittedAt?.toISOString() || attempt.result.evaluatedAt.toISOString(),
      isExpired: attempt.status === AttemptStatus.EXPIRED,
      result: {
        totalQuestions: attempt.result.totalQuestions,
        correctAnswers: attempt.result.correctAnswers,
        totalMarks: attempt.result.totalMarks,
        obtainedMarks: attempt.result.obtainedMarks,
        percentage: attempt.result.percentage,
        passed: attempt.result.passed,
      },
      message,
    };
  }

  /**
   * Enforces Round 2 Access Control and returns Round 2 assessment availability.
   * Returns 403 Forbidden if candidate has APTITUDE_FAILED or has not passed Round 1.
   */
  async checkRound2Access(userId: string): Promise<Round2AccessResponse> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    const application = await this.prisma.application.findFirst({
      where: { studentId: student.id },
      include: {
        adminApprovals: { orderBy: { approvedAt: "desc" } },
        assessmentAttempts: {
          include: { assessment: true, result: true },
          orderBy: { startedAt: "desc" },
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    if (!application) {
      throw new ForbiddenException("No recruitment application found.");
    }

    const eligibility = this.checkRound2Eligibility(application);

    if (!eligibility.eligible) {
      if (
        application.currentStatus === ApplicationStatus.APTITUDE_FAILED ||
        eligibility.round1Status === "FAILED"
      ) {
        throw new ForbiddenException(
          "Access Denied (403 Forbidden): You scored below the 80% passing benchmark in Round 1 Aptitude Assessment. You are not eligible to access Round 2.",
        );
      }
      throw new ForbiddenException(
        "Access Denied (403 Forbidden): Please complete and qualify the Round 1 Aptitude Assessment before accessing Round 2.",
      );
    }

    // Find Round 2 assessment for this recruitment drive
    const round2Assessment =
      (await this.prisma.assessment.findFirst({
        where: {
          recruitmentDriveId: application.recruitmentDriveId,
          type: AssessmentType.COMMUNICATION,
          isActive: true,
        },
      })) ||
      (await this.prisma.assessment.findFirst({
        where: {
          type: AssessmentType.COMMUNICATION,
          isActive: true,
        },
      }));

    if (round2Assessment) {
      await this.ensureRound2Questions(round2Assessment.id);
    }

    let existingAttempt = null;
    if (round2Assessment) {
      existingAttempt = await this.prisma.assessmentAttempt.findFirst({
        where: {
          applicationId: application.id,
          assessmentId: round2Assessment.id,
        },
        include: { result: true },
        orderBy: { startedAt: "desc" },
      });
    }

    const now = new Date();
    const round2Status = existingAttempt?.result
      ? (existingAttempt.result.passed ? "PASSED" : "FAILED")
      : existingAttempt
      ? existingAttempt.status
      : (application.currentStatus === ApplicationStatus.ADMIN_APPROVED ? "PENDING" : "NOT_STARTED");

    if (
      existingAttempt &&
      existingAttempt.status === AttemptStatus.IN_PROGRESS &&
      existingAttempt.expiresAt &&
      now >= existingAttempt.expiresAt
    ) {
      const evalRes = await this.submitAttempt(existingAttempt.id, userId);
      return {
        allowed: true,
        available: true,
        status: application.currentStatus,
        candidateName: student.fullName,
        message: "Your Round 2 assessment has ended and been evaluated.",
        assessmentId: round2Assessment?.id,
        title: round2Assessment?.title || "Round 2 — English Communication & Verbal Ability",
        type: "COMMUNICATION",
        durationMinutes: round2Assessment?.durationMinutes || 20,
        passPercentage: round2Assessment?.passPercentage
          ? Number(round2Assessment.passPercentage)
          : 75.0,
        questionCount: 15,
        attempt: {
          attemptId: evalRes.attemptId,
          startedAt: existingAttempt.startedAt.toISOString(),
          expiresAt: existingAttempt.expiresAt.toISOString(),
          durationMinutes: round2Assessment?.durationMinutes || 20,
          serverTime: now.toISOString(),
          status: evalRes.status,
          isExpired: true,
          result: evalRes.result,
        },
        result: evalRes.result,
        round1Status: eligibility.round1Status,
        round1Score: eligibility.round1Score,
        round1Percentage: eligibility.round1Percentage,
        round2Eligible: true,
        round2ApprovalStatus: eligibility.hasAdminApproval ? "APPROVED" : (eligibility.isPassedR1 ? "QUALIFIED" : "NONE"),
        round2Status: evalRes.result ? (evalRes.result.passed ? "PASSED" : "FAILED") : "EVALUATED",
        isOverridden: eligibility.hasAdminApproval,
      };
    }

    const welcomeMessage =
      eligibility.hasAdminApproval && !eligibility.isPassedR1
        ? "Your Round 1 score did not meet the automatic qualifying benchmark, but you have been approved by the Admin to continue to Round 2."
        : "Your Round 2 assessment is ready.";

    return {
      allowed: true,
      available: true,
      status: application.currentStatus,
      candidateName: student.fullName,
      message: welcomeMessage,
      assessmentId: round2Assessment?.id,
      title: round2Assessment?.title || "Round 2 — English Communication & Verbal Ability",
      type: "COMMUNICATION",
      durationMinutes: round2Assessment?.durationMinutes || 20,
      passPercentage: round2Assessment?.passPercentage
        ? Number(round2Assessment.passPercentage)
        : 75.0,
      questionCount: 15,
      attempt: existingAttempt
        ? {
            attemptId: existingAttempt.id,
            startedAt: existingAttempt.startedAt.toISOString(),
            expiresAt:
              existingAttempt.expiresAt?.toISOString() ||
              new Date(
                existingAttempt.startedAt.getTime() +
                  (round2Assessment?.durationMinutes || 20) * 60 * 1000,
              ).toISOString(),
            durationMinutes: round2Assessment?.durationMinutes || 20,
            serverTime: now.toISOString(),
            status: existingAttempt.status,
            isExpired: existingAttempt.status === AttemptStatus.EXPIRED,
            result: existingAttempt.result
              ? {
                  totalQuestions: existingAttempt.result.totalQuestions,
                  correctAnswers: existingAttempt.result.correctAnswers,
                  totalMarks: existingAttempt.result.totalMarks,
                  obtainedMarks: existingAttempt.result.obtainedMarks,
                  percentage: existingAttempt.result.percentage,
                  passed: existingAttempt.result.passed,
                }
              : null,
          }
        : undefined,
      result: existingAttempt?.result
        ? {
            totalQuestions: existingAttempt.result.totalQuestions,
            correctAnswers: existingAttempt.result.correctAnswers,
            totalMarks: existingAttempt.result.totalMarks,
            obtainedMarks: existingAttempt.result.obtainedMarks,
            percentage: existingAttempt.result.percentage,
            passed: existingAttempt.result.passed,
          }
        : null,
      round1Status: eligibility.round1Status,
      round1Score: eligibility.round1Score,
      round1Percentage: eligibility.round1Percentage,
      round2Eligible: true,
      round2ApprovalStatus: eligibility.hasAdminApproval ? "APPROVED" : (eligibility.isPassedR1 ? "QUALIFIED" : "NONE"),
      round2Status,
      isOverridden: eligibility.hasAdminApproval,
    };
  }

  /**
   * Retrieves final evaluation result across all rounds for authenticated candidate.
   * GET /api/student/final-result or /api/assessments/final-result
   */
  async getFinalResult(userId: string): Promise<FinalResultResponse> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true } },
      },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    const application = await this.prisma.application.findFirst({
      where: { studentId: student.id },
      include: {
        recruitmentDrive: true,
        adminApprovals: { orderBy: { approvedAt: "desc" } },
      },
      orderBy: { appliedAt: "desc" },
    });

    if (!application) {
      throw new NotFoundException("No recruitment application found.");
    }

    const hasAdminApproval = Boolean(
      application.currentStatus === ApplicationStatus.ADMIN_APPROVED ||
      application.adminApprovals?.some(
        (a: any) => a.newStatus === ApplicationStatus.ADMIN_APPROVED,
      ),
    );

    // Find Round 1 attempt & result
    const round1Attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        applicationId: application.id,
        assessment: { type: AssessmentType.APTITUDE },
      },
      include: { result: true },
      orderBy: { startedAt: "desc" },
    });

    // Find Round 2 attempt & result
    const round2Attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        applicationId: application.id,
        assessment: { type: AssessmentType.COMMUNICATION },
      },
      include: { result: true },
      orderBy: { startedAt: "desc" },
    });

    const isQualified = application.currentStatus === ApplicationStatus.QUALIFIED;
    const completedStatuses: ApplicationStatus[] = [
      ApplicationStatus.COMMUNICATION_PASSED,
      ApplicationStatus.COMMUNICATION_FAILED,
      ApplicationStatus.QUALIFIED,
    ];
    if (!hasAdminApproval) {
      completedStatuses.push(ApplicationStatus.APTITUDE_FAILED);
    }
    const isCompleted = completedStatuses.includes(application.currentStatus);

    const completedDate =
      round2Attempt?.submittedAt ||
      round1Attempt?.submittedAt ||
      application.updatedAt;

    return {
      candidateName: student.fullName,
      email: student.user.email,
      driveName: application.recruitmentDrive.name,
      position: application.recruitmentDrive.position,
      round1: round1Attempt?.result
        ? {
            totalQuestions: round1Attempt.result.totalQuestions,
            obtainedMarks: round1Attempt.result.obtainedMarks,
            percentage: round1Attempt.result.percentage,
            passed: round1Attempt.result.passed,
          }
        : null,
      round2: round2Attempt?.result
        ? {
            totalQuestions: round2Attempt.result.totalQuestions,
            obtainedMarks: round2Attempt.result.obtainedMarks,
            percentage: round2Attempt.result.percentage,
            passed: round2Attempt.result.passed,
          }
        : null,
      finalStatus: application.currentStatus,
      isQualified,
      completed: isCompleted,
      completedAt: completedDate.toISOString(),
      isOverridden: hasAdminApproval,
    };
  }
}
