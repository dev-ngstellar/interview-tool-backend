import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateDriveDto } from "./dto/create-drive.dto";
import { UpdateDriveDto } from "./dto/update-drive.dto";
import { DriveQueryDto } from "./dto/drive-query.dto";
import { AdminCandidateQueryDto } from "./dto/admin-candidate-query.dto";
import { DriveStatus, ApplicationStatus, Prisma, AssessmentType, AttemptStatus } from "@prisma/client";

@Injectable()
export class RecruitmentService {
  private readonly logger = new Logger(RecruitmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // ADMIN DRIVE MANAGEMENT
  // ============================================================================

  /**
   * Creates a new recruitment drive (Admin only).
   */
  async createDrive(dto: CreateDriveDto, adminUserId: string) {
    const startDate = new Date(dto.registrationStart);
    const endDate = new Date(dto.registrationEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException("Invalid registration date format.");
    }

    if (endDate <= startDate) {
      throw new BadRequestException(
        "Registration end date must be after registration start date.",
      );
    }

    const collegeInfo = dto.collegeInfo || dto.collegeEligibility || null;
    const normalizedPosition = "Marketing Executive";

    const drive = await this.prisma.$transaction(async (tx) => {
      const newDrive = await tx.recruitmentDrive.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          position: normalizedPosition,
          collegeInfo,
          registrationStart: startDate,
          registrationEnd: endDate,
          status: dto.status || DriveStatus.DRAFT,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "DRIVE_CREATED",
          entityType: "RecruitmentDrive",
          entityId: newDrive.id,
          newValue: {
            name: newDrive.name,
            position: newDrive.position,
            status: newDrive.status,
            registrationStart: startDate.toISOString(),
            registrationEnd: endDate.toISOString(),
          },
        },
      });

      return newDrive;
    });

    this.logger.log(
      `Recruitment drive created: "${drive.name}" (${drive.id}) by Admin ${adminUserId}`,
    );
    return drive;
  }

  /**
   * Lists drives for admin with filtering, search, and application counts.
   */
  async listAdminDrives(query: DriveQueryDto) {
    const { status, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RecruitmentDriveWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { collegeInfo: { contains: term, mode: "insensitive" } },
      ];
    }

    const [total, drives] = await Promise.all([
      this.prisma.recruitmentDrive.count({ where }),
      this.prisma.recruitmentDrive.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
    ]);

    const formattedDrives = drives.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      position: d.position,
      collegeEligibility: d.collegeInfo,
      registrationStart: d.registrationStart,
      registrationEnd: d.registrationEnd,
      status: d.status,
      applicationCount: d._count.applications,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return {
      data: formattedDrives,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves single drive details for admin.
   */
  async getAdminDriveById(id: string) {
    const drive = await this.prisma.recruitmentDrive.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
        assessments: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            durationMinutes: true,
            passPercentage: true,
            isActive: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!drive) {
      throw new NotFoundException(
        `Recruitment drive with ID "${id}" not found.`,
      );
    }

    const now = new Date();
    let registrationPhase = "UPCOMING";
    if (drive.registrationStart && drive.registrationEnd) {
      if (now < drive.registrationStart) {
        registrationPhase = "UPCOMING";
      } else if (now > drive.registrationEnd) {
        registrationPhase = "EXPIRED";
      } else {
        registrationPhase = "ACTIVE";
      }
    }

    return {
      id: drive.id,
      name: drive.name,
      description: drive.description,
      position: drive.position,
      collegeEligibility: drive.collegeInfo,
      registrationStart: drive.registrationStart,
      registrationEnd: drive.registrationEnd,
      status: drive.status,
      registrationPhase,
      applicationCount: drive._count.applications,
      assessments: drive.assessments,
      createdAt: drive.createdAt,
      updatedAt: drive.updatedAt,
    };
  }

  /**
   * Updates recruitment drive configuration (Admin only).
   */
  async updateDrive(id: string, dto: UpdateDriveDto, adminUserId: string) {
    const existing = await this.prisma.recruitmentDrive.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Recruitment drive with ID "${id}" not found.`,
      );
    }

    const updateData: Prisma.RecruitmentDriveUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined)
      updateData.description = dto.description?.trim() || null;
    if (dto.collegeEligibility !== undefined || dto.collegeInfo !== undefined) {
      updateData.collegeInfo =
        dto.collegeEligibility || dto.collegeInfo || null;
    }
    if (dto.status !== undefined) updateData.status = dto.status;

    // Date validation
    const newStart = dto.registrationStart
      ? new Date(dto.registrationStart)
      : existing.registrationStart;
    const newEnd = dto.registrationEnd
      ? new Date(dto.registrationEnd)
      : existing.registrationEnd;

    if (dto.registrationStart || dto.registrationEnd) {
      if (newStart && newEnd && newEnd <= newStart) {
        throw new BadRequestException(
          "Registration end date must be after registration start date.",
        );
      }
      if (dto.registrationStart) updateData.registrationStart = newStart;
      if (dto.registrationEnd) updateData.registrationEnd = newEnd;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const drive = await tx.recruitmentDrive.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "DRIVE_UPDATED",
          entityType: "RecruitmentDrive",
          entityId: id,
          oldValue: {
            name: existing.name,
            status: existing.status,
            registrationStart: existing.registrationStart,
            registrationEnd: existing.registrationEnd,
          },
          newValue: {
            name: drive.name,
            status: drive.status,
            registrationStart: drive.registrationStart,
            registrationEnd: drive.registrationEnd,
          },
        },
      });

      return drive;
    });

    this.logger.log(`Recruitment drive ${id} updated by Admin ${adminUserId}`);
    return updated;
  }

  /**
   * Updates drive status explicitly (OPEN, CLOSED, ARCHIVED, DRAFT).
   */
  async updateDriveStatus(
    id: string,
    status: DriveStatus,
    adminUserId: string,
  ) {
    const existing = await this.prisma.recruitmentDrive.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Recruitment drive with ID "${id}" not found.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const drive = await tx.recruitmentDrive.update({
        where: { id },
        data: { status },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "DRIVE_STATUS_CHANGED",
          entityType: "RecruitmentDrive",
          entityId: id,
          oldValue: { status: existing.status },
          newValue: { status: drive.status },
          metadata: { previousStatus: existing.status, newStatus: status },
        },
      });

      return drive;
    });

    this.logger.log(
      `Recruitment drive ${id} status changed from ${existing.status} to ${status} by Admin ${adminUserId}`,
    );
    return updated;
  }

  // ============================================================================
  // STUDENT / CANDIDATE DRIVE WORKFLOW
  // ============================================================================

  /**
   * Lists available recruitment drives for students.
   * Returns drives where status = OPEN and current time is within registration window.
   */
  async listAvailableDrives(studentUserId?: string) {
    const now = new Date();

    let studentId: string | null = null;
    if (studentUserId) {
      const student = await this.prisma.student.findUnique({
        where: { userId: studentUserId },
      });
      studentId = student?.id || null;
    }

    const drives = await this.prisma.recruitmentDrive.findMany({
      where: {
        status: DriveStatus.OPEN,
        registrationStart: { lte: now },
        registrationEnd: { gte: now },
      },
      orderBy: { registrationEnd: "asc" },
      include: {
        applications: studentId
          ? {
              where: { studentId },
              select: {
                id: true,
                currentStatus: true,
                appliedAt: true,
              },
            }
          : false,
      },
    });

    return drives.map((drive) => {
      const existingApp =
        drive.applications && drive.applications.length > 0
          ? drive.applications[0]
          : null;

      return {
        id: drive.id,
        name: drive.name,
        description: drive.description,
        position: drive.position,
        eligibility: drive.collegeInfo,
        registrationStart: drive.registrationStart,
        registrationEnd: drive.registrationEnd,
        isAvailable: true,
        hasApplied: !!existingApp,
        applicationId: existingApp?.id || null,
        applicationStatus: existingApp?.currentStatus || null,
        appliedAt: existingApp?.appliedAt || null,
      };
    });
  }

  /**
   * Retrieves single drive details for a student.
   * Validates drive is open and active for candidates.
   */
  async getAvailableDriveById(driveId: string, studentUserId?: string) {
    const drive = await this.prisma.recruitmentDrive.findUnique({
      where: { id: driveId },
      include: {
        assessments: {
          where: { isActive: true },
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            durationMinutes: true,
          },
          orderBy: { type: "asc" },
        },
      },
    });

    if (!drive) {
      throw new NotFoundException("Recruitment drive not found.");
    }

    const now = new Date();
    const isDateValid =
      (!drive.registrationStart || now >= drive.registrationStart) &&
      (!drive.registrationEnd || now <= drive.registrationEnd);

    if (drive.status !== DriveStatus.OPEN || !isDateValid) {
      throw new BadRequestException(
        "This recruitment drive is currently not open or available for student applications.",
      );
    }

    let existingApp: {
      id: string;
      currentStatus: ApplicationStatus;
      appliedAt: Date;
    } | null = null;
    if (studentUserId) {
      const student = await this.prisma.student.findUnique({
        where: { userId: studentUserId },
      });
      if (student) {
        existingApp = await this.prisma.application.findUnique({
          where: {
            studentId_recruitmentDriveId: {
              studentId: student.id,
              recruitmentDriveId: drive.id,
            },
          },
          select: {
            id: true,
            currentStatus: true,
            appliedAt: true,
          },
        });
      }
    }

    return {
      id: drive.id,
      name: drive.name,
      description: drive.description,
      position: drive.position,
      eligibility: drive.collegeInfo,
      registrationStart: drive.registrationStart,
      registrationEnd: drive.registrationEnd,
      assessments: drive.assessments,
      hasApplied: !!existingApp,
      applicationId: existingApp?.id || null,
      applicationStatus: existingApp?.currentStatus || null,
      appliedAt: existingApp?.appliedAt || null,
    };
  }

  /**
   * Student applies to an open recruitment drive.
   * Enforces all business rules server-side.
   */
  async applyToDrive(driveId: string, studentUserId: string) {
    // 1. Verify student profile exists
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new NotFoundException("Student candidate profile not found.");
    }

    // 2. Verify recruitment drive exists
    const drive = await this.prisma.recruitmentDrive.findUnique({
      where: { id: driveId },
    });

    if (!drive) {
      throw new NotFoundException("Recruitment drive not found.");
    }

    // 3. Verify drive is OPEN
    if (drive.status !== DriveStatus.OPEN) {
      throw new BadRequestException(
        "Recruitment drive is not open for candidate applications.",
      );
    }

    // 4. Verify within registration period
    const now = new Date();
    if (drive.registrationStart && now < drive.registrationStart) {
      throw new BadRequestException(
        "Registration for this recruitment drive has not started yet.",
      );
    }
    if (drive.registrationEnd && now > drive.registrationEnd) {
      throw new BadRequestException(
        "Registration for this recruitment drive has ended.",
      );
    }

    // 5. Verify no duplicate application
    const existingApplication = await this.prisma.application.findUnique({
      where: {
        studentId_recruitmentDriveId: {
          studentId: student.id,
          recruitmentDriveId: drive.id,
        },
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        "You have already applied for this recruitment drive.",
      );
    }

    // 6. Create Application record with initial status = REGISTERED
    try {
      const application = await this.prisma.$transaction(async (tx) => {
        const app = await tx.application.create({
          data: {
            studentId: student.id,
            recruitmentDriveId: drive.id,
            currentStatus: ApplicationStatus.REGISTERED,
          },
          include: {
            recruitmentDrive: {
              select: {
                id: true,
                name: true,
                position: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: studentUserId,
            action: "APPLICATION_SUBMITTED",
            entityType: "Application",
            entityId: app.id,
            metadata: {
              studentId: student.id,
              driveId: drive.id,
              driveName: drive.name,
              position: drive.position,
              initialStatus: ApplicationStatus.REGISTERED,
            },
          },
        });

        return app;
      });

      this.logger.log(
        `Student ${student.email} successfully applied to Drive "${drive.name}" (Application ID: ${application.id})`,
      );

      return {
        data: {
          id: application.id,
          applicationId: application.id,
          drive: {
            id: application.recruitmentDrive.id,
            name: application.recruitmentDrive.name,
            position: application.recruitmentDrive.position,
          },
          currentStatus: application.currentStatus,
          appliedAt: application.appliedAt,
        },
        message:
          "Application submitted successfully for Marketing Executive recruitment drive.",
      };
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException(
          "You have already applied for this recruitment drive.",
        );
      }
      throw error;
    }
  }

  // ============================================================================
  // ADMIN CANDIDATE MANAGEMENT & RECRUITMENT PIPELINE
  // ============================================================================

  private formatCandidateRecord(app: any) {
    const student = app.student;

    // Find Round 1 (APTITUDE) attempt
    const r1Attempt = app.assessmentAttempts?.find(
      (a: any) => a.assessment?.type === AssessmentType.APTITUDE,
    );
    const r1Result = r1Attempt?.result;

    let r1Status: string = "PENDING";
    let r1Score: number | null = null;
    let r1Total: number | null = null;
    let r1Percentage: number | null = null;

    if (r1Result) {
      r1Status = r1Result.passed ? "PASSED" : "FAILED";
      r1Score = r1Result.obtainedMarks;
      r1Total = r1Result.totalMarks || r1Result.totalQuestions || 15;
      r1Percentage = r1Result.percentage;
    } else if (r1Attempt) {
      if (r1Attempt.status === AttemptStatus.IN_PROGRESS) {
        r1Status = "IN_PROGRESS";
      } else if (r1Attempt.status === AttemptStatus.EXPIRED) {
        r1Status = "EXPIRED";
      }
    } else if (app.currentStatus === ApplicationStatus.APTITUDE_IN_PROGRESS) {
      r1Status = "IN_PROGRESS";
    }

    // Find Round 2 (COMMUNICATION) attempt
    const r2Attempt = app.assessmentAttempts?.find(
      (a: any) => a.assessment?.type === AssessmentType.COMMUNICATION,
    );
    const r2Result = r2Attempt?.result;

    let r2Status: string = "PENDING";
    let r2Score: number | null = null;
    let r2Total: number | null = null;
    let r2Percentage: number | null = null;

    if (r2Result) {
      r2Status = r2Result.passed ? "PASSED" : "FAILED";
      r2Score = r2Result.obtainedMarks;
      r2Total = r2Result.totalMarks || r2Result.totalQuestions || 15;
      r2Percentage = r2Result.percentage;
    } else if (r2Attempt) {
      if (r2Attempt.status === AttemptStatus.IN_PROGRESS) {
        r2Status = "IN_PROGRESS";
      } else if (r2Attempt.status === AttemptStatus.EXPIRED) {
        r2Status = "EXPIRED";
      }
    } else if (app.currentStatus === ApplicationStatus.COMMUNICATION_IN_PROGRESS) {
      r2Status = "IN_PROGRESS";
    } else if (
      r1Status === "FAILED" &&
      app.currentStatus !== ApplicationStatus.ADMIN_APPROVED &&
      (!app.adminApprovals || app.adminApprovals.length === 0)
    ) {
      r2Status = "NOT_ELIGIBLE";
    }

    const latestApproval = app.adminApprovals?.[0] || null;
    const isOverridden = Boolean(
      latestApproval || app.currentStatus === ApplicationStatus.ADMIN_APPROVED,
    );

    return {
      applicationId: app.id,
      studentId: student?.studentId || student?.id,
      name: student?.fullName || "Candidate",
      email: student?.email || "",
      phone: student?.phone || "",
      college: student?.collegeName || "",
      course: student?.course || "",
      department: student?.department || "",
      graduationYear: student?.graduationYear || null,
      registrationDate: app.appliedAt.toISOString(),
      overallStatus: app.currentStatus,
      round1: {
        status: r1Status,
        score: r1Score,
        total: r1Total,
        percentage: r1Percentage,
        startedAt: r1Attempt?.startedAt ? r1Attempt.startedAt.toISOString() : null,
        completedAt: r1Attempt?.submittedAt
          ? r1Attempt.submittedAt.toISOString()
          : r1Result?.evaluatedAt
          ? r1Result.evaluatedAt.toISOString()
          : null,
      },
      round2: {
        status: r2Status,
        score: r2Score,
        total: r2Total,
        percentage: r2Percentage,
        startedAt: r2Attempt?.startedAt ? r2Attempt.startedAt.toISOString() : null,
        completedAt: r2Attempt?.submittedAt
          ? r2Attempt.submittedAt.toISOString()
          : r2Result?.evaluatedAt
          ? r2Result.evaluatedAt.toISOString()
          : null,
      },
      isOverridden,
      adminApproval: latestApproval
        ? {
            id: latestApproval.id,
            adminUserId: latestApproval.adminUserId,
            adminEmail: latestApproval.adminUser?.email || "Admin",
            reason: latestApproval.reason,
            remarks: latestApproval.remarks || null,
            approvedAt: latestApproval.approvedAt.toISOString(),
          }
        : null,
    };
  }

  /**
   * Calculates comprehensive live recruitment statistics for the Admin Dashboard.
   */
  async getDashboardStats() {
    const totalCandidates = await this.prisma.application.count();

    const allApps = await this.prisma.application.findMany({
      include: {
        student: true,
        assessmentAttempts: {
          include: {
            assessment: true,
            result: true,
          },
        },
        adminApprovals: {
          include: { adminUser: { select: { email: true } } },
          orderBy: { approvedAt: "desc" },
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    const formattedList = allApps.map((app) => this.formatCandidateRecord(app));

    let round1Completed = 0;
    let round1Passed = 0;
    let round1Failed = 0;
    let round2InProgress = 0;
    let round2Completed = 0;
    let round2Passed = 0;
    let round2Failed = 0;
    let qualified = 0;

    const adminReviewCandidates: any[] = [];

    for (const c of formattedList) {
      if (c.round1.status === "PASSED" || c.round1.status === "FAILED") {
        round1Completed++;
      }
      if (c.round1.status === "PASSED") {
        round1Passed++;
      }
      if (c.round1.status === "FAILED") {
        round1Failed++;
        if (!c.isOverridden) {
          adminReviewCandidates.push(c);
        }
      }

      if (c.round2.status === "IN_PROGRESS") {
        round2InProgress++;
      }
      if (c.round2.status === "PASSED" || c.round2.status === "FAILED") {
        round2Completed++;
      }
      if (c.round2.status === "PASSED") {
        round2Passed++;
      }
      if (c.round2.status === "FAILED") {
        round2Failed++;
      }
      if (c.overallStatus === ApplicationStatus.QUALIFIED) {
        qualified++;
      }
    }

    const r1InProgress = formattedList.filter(
      (c) => c.round1.status === "IN_PROGRESS",
    ).length;

    const r2Eligible = formattedList.filter(
      (c) => c.round1.status === "PASSED" || c.isOverridden,
    ).length;

    // Zero-qualified scenario: R1 completed by candidates but 0 passed
    const zeroQualified = round1Completed > 0 && round1Passed === 0;

    let totalSecurityEvents = 0;
    let candidatesWithSecurityEvents = 0;
    try {
      if ((this.prisma as any).assessmentSecurityEvent) {
        totalSecurityEvents = await (this.prisma as any).assessmentSecurityEvent.count();
        const distinctAttempts = await (this.prisma as any).assessmentSecurityEvent.findMany({
          distinct: ["attemptId"],
          select: {
            attempt: {
              select: {
                applicationId: true,
              },
            },
          },
        });
        const distinctApps = new Set(
          distinctAttempts.map((a: any) => a.attempt?.applicationId).filter(Boolean),
        );
        candidatesWithSecurityEvents = distinctApps.size;
      }
    } catch {
      totalSecurityEvents = 0;
      candidatesWithSecurityEvents = 0;
    }

    return {
      totalCandidates,
      round1Completed,
      round1Passed,
      round1Failed,
      round2InProgress,
      qualified,
      securityMetrics: {
        totalEvents: totalSecurityEvents,
        candidatesWithEvents: candidatesWithSecurityEvents,
      },
      pipeline: {
        round1: {
          registered: totalCandidates,
          inProgress: r1InProgress,
          passed: round1Passed,
          failed: round1Failed,
        },
        round2: {
          eligible: r2Eligible,
          inProgress: round2InProgress,
          passed: round2Passed,
          failed: round2Failed,
        },
      },
      zeroQualified,
      adminReviewCandidates: adminReviewCandidates.slice(0, 10),
      recentCandidates: formattedList.slice(0, 5),
    };
  }

  /**
   * Retrieves paginated candidate list with searching, filtering, and sorting.
   */
  async listCandidates(query: AdminCandidateQueryDto) {
    const {
      search,
      round1Status,
      round2Status,
      overallStatus,
      sortBy = "registrationDate",
      sortOrder = "desc",
      page = 1,
      limit = 10,
    } = query;

    const allApps = await this.prisma.application.findMany({
      include: {
        student: true,
        assessmentAttempts: {
          include: {
            assessment: true,
            result: true,
          },
        },
        adminApprovals: {
          include: { adminUser: { select: { email: true } } },
          orderBy: { approvedAt: "desc" },
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    let formatted = allApps.map((app) => this.formatCandidateRecord(app));

    // 1. Filter: Search
    if (search && search.trim().length > 0) {
      const term = search.trim().toLowerCase();
      formatted = formatted.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.studentId && c.studentId.toLowerCase().includes(term)) ||
          c.email.toLowerCase().includes(term) ||
          c.college.toLowerCase().includes(term) ||
          c.phone.toLowerCase().includes(term),
      );
    }

    // 2. Filter: Round 1 Status
    if (round1Status && round1Status !== "ALL") {
      formatted = formatted.filter((c) => c.round1.status === round1Status);
    }

    // 3. Filter: Round 2 Status
    if (round2Status && round2Status !== "ALL") {
      formatted = formatted.filter((c) => c.round2.status === round2Status);
    }

    // 4. Filter: Overall Status
    if (overallStatus && overallStatus !== "ALL") {
      formatted = formatted.filter((c) => {
        if (overallStatus === "QUALIFIED") return c.overallStatus === ApplicationStatus.QUALIFIED;
        if (overallStatus === "ADMIN_APPROVED") return c.overallStatus === ApplicationStatus.ADMIN_APPROVED || c.isOverridden;
        if (overallStatus === "ADMIN_REVIEW") return c.overallStatus === ApplicationStatus.ADMIN_REVIEW || (c.round1.status === "FAILED" && !c.isOverridden);
        if (overallStatus === "ROUND_2") return ["COMMUNICATION_PENDING", "COMMUNICATION_IN_PROGRESS", "COMMUNICATION_PASSED", "COMMUNICATION_FAILED", "QUALIFIED"].includes(c.overallStatus);
        if (overallStatus === "NOT_QUALIFIED") return c.overallStatus === ApplicationStatus.COMMUNICATION_FAILED || (c.round1.status === "FAILED" && !c.isOverridden);
        return c.overallStatus === overallStatus;
      });
    }

    // 5. Sorting
    formatted.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortBy) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "studentId":
          valA = (a.studentId || "").toLowerCase();
          valB = (b.studentId || "").toLowerCase();
          break;
        case "r1Score":
          valA = a.round1.score ?? -1;
          valB = b.round1.score ?? -1;
          break;
        case "r1Percentage":
          valA = a.round1.percentage ?? -1;
          valB = b.round1.percentage ?? -1;
          break;
        case "r2Score":
          valA = a.round2.score ?? -1;
          valB = b.round2.score ?? -1;
          break;
        case "r2Percentage":
          valA = a.round2.percentage ?? -1;
          valB = b.round2.percentage ?? -1;
          break;
        case "registrationDate":
        default:
          valA = new Date(a.registrationDate).getTime();
          valB = new Date(b.registrationDate).getTime();
          break;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const total = formatted.length;
    const startIndex = (page - 1) * limit;
    const paginated = formatted.slice(startIndex, startIndex + limit);

    return {
      candidates: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single candidate comprehensive record and audit history.
   */
  async getCandidateDetails(applicationId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: true,
        recruitmentDrive: true,
        assessmentAttempts: {
          include: {
            assessment: true,
            result: true,
          },
          orderBy: { startedAt: "asc" },
        },
        adminApprovals: {
          include: { adminUser: { select: { email: true, role: true } } },
          orderBy: { approvedAt: "desc" },
        },
      },
    });

    if (!app) {
      throw new NotFoundException(`Candidate application ${applicationId} not found.`);
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: app.id },
          { entityId: app.studentId },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const attemptIds = app.assessmentAttempts.map((att: any) => att.id);
    let securityEventsList: any[] = [];
    try {
      if ((this.prisma as any).assessmentSecurityEvent && attemptIds.length > 0) {
        securityEventsList = await (this.prisma as any).assessmentSecurityEvent.findMany({
          where: { attemptId: { in: attemptIds } },
          orderBy: { createdAt: "desc" },
        });
      }
    } catch {
      securityEventsList = [];
    }

    const eventCountsByType: Record<string, number> = {};
    let totalViolations = 0;
    for (const ev of securityEventsList) {
      eventCountsByType[ev.eventType] = (eventCountsByType[ev.eventType] || 0) + 1;
      if (ev.violationNumber > 0) {
        totalViolations = Math.max(totalViolations, ev.violationNumber);
      }
    }

    let securityStatus = "Normal";
    if (totalViolations >= 3) {
      securityStatus = "Flagged";
    } else if (totalViolations >= 1) {
      securityStatus = "Warning";
    }

    const formatted = this.formatCandidateRecord(app);

    return {
      ...formatted,
      drive: {
        id: app.recruitmentDrive.id,
        name: app.recruitmentDrive.name,
        position: app.recruitmentDrive.position,
      },
      securityActivity: {
        totalEvents: securityEventsList.length,
        violationsCount: totalViolations,
        securityStatus,
        breakdown: eventCountsByType,
        events: securityEventsList.map((ev: any) => ({
          id: ev.id,
          attemptId: ev.attemptId,
          eventType: ev.eventType,
          violationNumber: ev.violationNumber,
          createdAt: ev.createdAt.toISOString(),
          metadata: ev.metadata,
        })),
      },
      detailedAttempts: app.assessmentAttempts.map((att) => ({
        id: att.id,
        type: att.assessment.type,
        title: att.assessment.title,
        status: att.status,
        startedAt: att.startedAt?.toISOString(),
        submittedAt: att.submittedAt?.toISOString(),
        expiresAt: att.expiresAt?.toISOString(),
        result: att.result
          ? {
              totalQuestions: att.result.totalQuestions,
              correctAnswers: att.result.correctAnswers,
              totalMarks: att.result.totalMarks,
              obtainedMarks: att.result.obtainedMarks,
              percentage: att.result.percentage,
              passed: att.result.passed,
              evaluatedAt: att.result.evaluatedAt.toISOString(),
            }
          : null,
      })),
      approvalsHistory: app.adminApprovals.map((ap) => ({
        id: ap.id,
        adminEmail: ap.adminUser.email,
        previousStatus: ap.previousStatus,
        newStatus: ap.newStatus,
        reason: ap.reason,
        remarks: ap.remarks,
        approvedAt: ap.approvedAt.toISOString(),
      })),
      auditLogs: auditLogs.map((al) => ({
        id: al.id,
        action: al.action,
        entityType: al.entityType,
        createdAt: al.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Overrides Round 1 failure for a candidate and grants Round 2 eligibility.
   * Records immutable AdminApproval and AuditLog records.
   * Does NOT alter candidate's actual Round 1 score.
   */
  async overrideRound2(
    applicationId: string,
    adminUserId: string,
    reason: string,
    remarks?: string,
  ) {
    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException("A valid approval reason (minimum 3 characters) is required.");
    }

    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: true,
        assessmentAttempts: {
          include: {
            assessment: true,
            result: true,
          },
        },
        adminApprovals: true,
      },
    });

    if (!app) {
      throw new NotFoundException(`Candidate application ${applicationId} not found.`);
    }

    // Prevent duplicate override
    if (
      app.currentStatus === ApplicationStatus.ADMIN_APPROVED ||
      app.adminApprovals.length > 0
    ) {
      throw new ConflictException(
        "Candidate has already been approved and moved to Round 2. Duplicate overrides are prevented.",
      );
    }

    const previousStatus = app.currentStatus;
    const r1Attempt = app.assessmentAttempts.find(
      (a) => a.assessment.type === AssessmentType.APTITUDE,
    );
    const r1Score = r1Attempt?.result?.obtainedMarks ?? null;
    const r1Percentage = r1Attempt?.result?.percentage ?? null;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create AdminApproval audit record
      const approval = await tx.adminApproval.create({
        data: {
          applicationId: app.id,
          adminUserId,
          previousStatus,
          newStatus: ApplicationStatus.ADMIN_APPROVED,
          reason: reason.trim(),
          remarks: remarks?.trim() || null,
        },
      });

      // 2. Update Application Status to ADMIN_APPROVED (preserves Round 1 score intact)
      const updatedApp = await tx.application.update({
        where: { id: app.id },
        data: {
          currentStatus: ApplicationStatus.ADMIN_APPROVED,
        },
      });

      // 3. Create immutable AuditLog
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "ADMIN_OVERRIDE_ROUND_2_APPROVED",
          entityType: "Application",
          entityId: app.id,
          oldValue: {
            status: previousStatus,
            r1Score,
            r1Percentage,
          },
          newValue: {
            status: ApplicationStatus.ADMIN_APPROVED,
            approvalId: approval.id,
            reason: reason.trim(),
            remarks: remarks?.trim() || null,
          },
        },
      });

      return { approval, updatedApp };
    });

    this.logger.log(
      `[Admin Override] Admin ${adminUserId} approved candidate ${app.student.email} (${app.id}) for Round 2. Reason: ${reason}`,
    );

    return {
      success: true,
      message: `Candidate ${app.student.fullName} has been approved for Round 2.`,
      approvalId: result.approval.id,
      newStatus: result.updatedApp.currentStatus,
    };
  }

  /**
   * Bulk overrides Round 1 failure for multiple candidates (e.g. zero-qualified scenario).
   */
  async bulkOverrideRound2(
    applicationIds: string[],
    adminUserId: string,
    reason: string,
    remarks?: string,
  ) {
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new BadRequestException("At least one candidate must be selected for approval.");
    }
    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException("A valid approval reason (minimum 3 characters) is required.");
    }

    let approvedCount = 0;
    const errors: string[] = [];

    for (const appId of applicationIds) {
      try {
        await this.overrideRound2(appId, adminUserId, reason, remarks);
        approvedCount++;
      } catch (err: any) {
        errors.push(`Application ${appId}: ${err?.message || "Failed to approve"}`);
      }
    }

    return {
      success: approvedCount > 0,
      approvedCount,
      totalRequested: applicationIds.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully approved ${approvedCount} candidate(s) for Round 2.`,
    };
  }
}
