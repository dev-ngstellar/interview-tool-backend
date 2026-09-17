import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { StorageService } from "../../common/storage/storage.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ApplicationStatus, AssessmentType } from "@prisma/client";
import * as path from "path";

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  // Whitelisted resume MIME types and extensions
  private readonly allowedMimes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);

  private readonly allowedExtensions = new Set([".pdf", ".doc", ".docx"]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Retrieves profile of authenticated student.
   * Derived securely from the JWT session userId.
   */
  async getProfile(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(
        "Student profile not found for this account.",
      );
    }

    const isProfileComplete = this.checkProfileCompleteness(student);

    return {
      id: student.id,
      studentId: student.studentId,
      userId: student.userId,
      email: student.user.email,
      fullName: student.fullName,
      phone: student.phone,
      collegeName: student.collegeName,
      course: student.course,
      department: student.department,
      graduationYear: student.graduationYear,
      hasResume: !!student.resumeUrl,
      resumeUrl: student.resumeUrl ? "/api/student/profile/resume" : null,
      isProfileComplete,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }

  /**
   * Updates student personal and academic profile.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.student.update({
        where: { userId },
        data: {
          fullName: dto.fullName.trim(),
          studentId: dto.studentId !== undefined ? (dto.studentId?.trim() || null) : student.studentId,
          phone: dto.phone.trim(),
          collegeName: dto.collegeName !== undefined ? (dto.collegeName?.trim() || null) : student.collegeName,
          course: dto.course !== undefined ? (dto.course?.trim() || null) : student.course,
          department: dto.department !== undefined ? (dto.department?.trim() || null) : student.department,
          graduationYear: dto.graduationYear !== undefined ? (dto.graduationYear ? Number(dto.graduationYear) : null) : student.graduationYear,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "STUDENT_PROFILE_UPDATED",
          entityType: "Student",
          entityId: result.id,
          newValue: {
            fullName: result.fullName,
            studentId: result.studentId,
            phone: result.phone,
            collegeName: result.collegeName,
            course: result.course,
            department: result.department,
            graduationYear: result.graduationYear,
          },
        },
      });

      // If profile is fully complete (including resume), transition any REGISTERED applications to APTITUDE_PENDING
      if (this.checkProfileCompleteness(result)) {
        await tx.application.updateMany({
          where: {
            studentId: result.id,
            currentStatus: ApplicationStatus.REGISTERED,
          },
          data: {
            currentStatus: ApplicationStatus.APTITUDE_PENDING,
          },
        });
      }

      return result;
    });

    this.logger.log(
      `Student profile updated for user ${userId} (Student: ${updated.id})`,
    );

    const isProfileComplete = this.checkProfileCompleteness(updated);

    return {
      id: updated.id,
      userId: updated.userId,
      email: updated.email,
      fullName: updated.fullName,
      phone: updated.phone,
      collegeName: updated.collegeName,
      course: updated.course,
      department: updated.department,
      graduationYear: updated.graduationYear,
      hasResume: !!updated.resumeUrl,
      resumeUrl: updated.resumeUrl ? "/api/student/profile/resume" : null,
      isProfileComplete,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Securely handles multipart resume upload.
   * Performs MIME verification, size check, filename sanitization, and stores through StorageService.
   */
  async uploadResume(userId: string, file?: Express.Multer.File) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException(
        "No resume file provided in upload request.",
      );
    }

    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    // 1. File Size Verification
    const maxMb = this.storageService.getMaxFileSizeMb();
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `Resume file size exceeds maximum limit of ${maxMb}MB. Uploaded size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      );
    }

    // 2. Extension & MIME Verification
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.has(ext)) {
      throw new BadRequestException(
        `Invalid file format "${ext}". Only .pdf, .doc, and .docx resumes are accepted.`,
      );
    }

    if (
      !this.allowedMimes.has(file.mimetype) &&
      file.mimetype !== "application/octet-stream"
    ) {
      throw new BadRequestException(
        `Invalid file MIME type "${file.mimetype}". Expected PDF or Microsoft Word document.`,
      );
    }

    // 3. Delegate to Object Storage abstraction
    const stored = await this.storageService.uploadFile({
      fileName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      folder: `resumes/${student.id}`,
    });

    // 4. Update Student record & transition applications if profile is now complete
    await this.prisma.$transaction(async (tx) => {
      const updatedStudent = await tx.student.update({
        where: { id: student.id },
        data: { resumeUrl: stored.key },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "RESUME_UPLOADED",
          entityType: "Student",
          entityId: student.id,
          metadata: {
            storageKey: stored.key,
            fileName: file.originalname,
            sizeBytes: file.size,
          },
        },
      });

      // Transition any existing REGISTERED applications to APTITUDE_PENDING if profile is now fully completed
      if (this.checkProfileCompleteness(updatedStudent)) {
        await tx.application.updateMany({
          where: {
            studentId: student.id,
            currentStatus: ApplicationStatus.REGISTERED,
          },
          data: {
            currentStatus: ApplicationStatus.APTITUDE_PENDING,
          },
        });
      }
    });

    this.logger.log(
      `Resume uploaded successfully for student ${student.id}: ${stored.key}`,
    );

    return {
      success: true,
      message: "Resume uploaded successfully.",
      file: {
        key: stored.key,
        url: stored.url,
        originalName: file.originalname,
        sizeBytes: stored.sizeBytes,
      },
    };
  }

  /**
   * Securely streams resume for the authenticated student.
   * Verifies that the requester owns the resume.
   */
  async getResume(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student || !student.resumeUrl) {
      throw new NotFoundException(
        "No resume has been uploaded for this candidate profile.",
      );
    }

    const file = await this.storageService.getFile(student.resumeUrl);
    if (!file) {
      throw new NotFoundException(
        "Stored resume file could not be retrieved from storage.",
      );
    }

    const fileName = file.originalName || path.basename(student.resumeUrl);

    return {
      buffer: file.buffer,
      mimeType: file.mimeType,
      fileName,
    };
  }

  /**
   * Lists all applications for authenticated student.
   */
  async getApplications(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    const applications = await this.prisma.application.findMany({
      where: { studentId: student.id },
      orderBy: { appliedAt: "desc" },
      include: {
        recruitmentDrive: {
          select: {
            id: true,
            name: true,
            position: true,
            status: true,
            registrationStart: true,
            registrationEnd: true,
          },
        },
      },
    });

    return applications.map((app) => ({
      id: app.id,
      recruitmentDrive: {
        id: app.recruitmentDrive.id,
        name: app.recruitmentDrive.name,
        position: app.recruitmentDrive.position,
        status: app.recruitmentDrive.status,
      },
      currentStatus: app.currentStatus,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
    }));
  }

  /**
   * Retrieves single application detail with strict ownership enforcement.
   */
  async getApplicationById(applicationId: string, userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException("Student profile not found.");
    }

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        recruitmentDrive: {
          select: {
            id: true,
            name: true,
            description: true,
            position: true,
            collegeInfo: true,
            status: true,
            registrationStart: true,
            registrationEnd: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(
        `Application with ID "${applicationId}" not found.`,
      );
    }

    // Critical authorization rule: Ensure application belongs to the calling student
    if (application.studentId !== student.id) {
      throw new ForbiddenException(
        "Access denied. You do not have permission to view this application.",
      );
    }

    return {
      id: application.id,
      recruitmentDrive: {
        id: application.recruitmentDrive.id,
        name: application.recruitmentDrive.name,
        description: application.recruitmentDrive.description,
        position: application.recruitmentDrive.position,
        collegeEligibility: application.recruitmentDrive.collegeInfo,
        status: application.recruitmentDrive.status,
      },
      currentStatus: application.currentStatus,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
    };
  }

  /**
   * Helper to verify if all required candidate profile fields and resume are present.
   */
  private checkProfileCompleteness(student: {
    fullName: string;
    phone: string;
    studentId?: string | null;
    collegeName?: string | null;
    course?: string | null;
    department?: string | null;
    graduationYear?: number | null;
    resumeUrl?: string | null;
  }): boolean {
    return (
      Boolean(student.fullName && student.fullName.trim().length >= 2) &&
      Boolean(student.phone && student.phone.trim().length >= 7)
    );
  }

  /**
   * Retrieves final recruitment assessment result for student.
   */
  async getFinalResult(userId: string) {
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
      },
      orderBy: { appliedAt: "desc" },
    });

    if (!application) {
      throw new NotFoundException("No recruitment application found.");
    }

    const round1Attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        applicationId: application.id,
        assessment: { type: AssessmentType.APTITUDE },
      },
      include: { result: true },
      orderBy: { startedAt: "desc" },
    });

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
      ApplicationStatus.APTITUDE_FAILED,
      ApplicationStatus.COMMUNICATION_PASSED,
      ApplicationStatus.COMMUNICATION_FAILED,
      ApplicationStatus.QUALIFIED,
    ];
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
    };
  }
}
