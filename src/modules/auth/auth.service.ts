import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  BadGatewayException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../database/prisma.service";
import { EmailService } from "../../email/email.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import {
  Role,
  DriveStatus,
  ApplicationStatus,
  AssessmentType,
} from "@prisma/client";
import { AuthResponse, JwtPayload, SafeUser } from "./types/auth.types";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Registers a new student account.
   */
  async registerStudent(dto: RegisterDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 0. Completed candidate check (Requirement 6, 7, 8, 10, 14, 15)
    await this.verifyCandidateNotCompleted(normalizedEmail);

    // Check duplicate account
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException(
        "An account with this email address already exists.",
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create User and Student profile record in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: hashedPassword,
          role: Role.STUDENT,
          isActive: true,
        },
      });

      await tx.student.create({
        data: {
          userId: newUser.id,
          fullName: "",
          email: normalizedEmail,
          phone: "",
          collegeName: "",
          course: "",
          department: "",
          graduationYear: new Date().getFullYear(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: "STUDENT_REGISTER",
          entityType: "User",
          entityId: newUser.id,
          metadata: { email: normalizedEmail, role: Role.STUDENT },
        },
      });

      return newUser;
    });

    this.logger.log(
      `Student registered successfully: ${user.email} (ID: ${user.id})`,
    );

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    const accessToken = this.generateToken(safeUser);
    return { accessToken, user: safeUser };
  }

  /**
   * Universal login handler validating credentials, active status, and enforced role.
   */
  async login(dto: LoginDto, expectedRole?: Role): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Safe error message to avoid account enumeration
    if (!user) {
      this.logger.warn(
        `Failed login attempt for non-existent user: ${normalizedEmail}`,
      );
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (!user.isActive) {
      this.logger.warn(`Login rejected for inactive user: ${normalizedEmail}`);
      throw new UnauthorizedException(
        "Account has been deactivated. Please contact administration.",
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      this.logger.warn(`Failed password attempt for user: ${normalizedEmail}`);
      throw new UnauthorizedException("Invalid email or password.");
    }

    // Role-based boundary enforcement
    if (expectedRole && user.role !== expectedRole) {
      this.logger.warn(
        `Role mismatch during login: User ${normalizedEmail} with role ${user.role} attempted ${expectedRole} portal login.`,
      );
      throw new UnauthorizedException(
        "Invalid credentials or unauthorized role for this portal.",
      );
    }

    // Record login audit event
    const auditAction =
      user.role === Role.ADMIN ? "ADMIN_LOGIN" : "STUDENT_LOGIN";
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: auditAction,
        entityType: "User",
        entityId: user.id,
        metadata: { email: user.email, role: user.role },
      },
    });

    this.logger.log(`User logged in: ${user.email} (${user.role})`);

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    const accessToken = this.generateToken(safeUser);
    return { accessToken, user: safeUser };
  }

  /**
   * Retrieves safe profile of authenticated user.
   */
  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        "User session is invalid or user has been deactivated.",
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  /**
   * Handles user logout audit tracking.
   */
  async logout(userId: string): Promise<{ success: boolean; message: string }> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: "LOGOUT",
        entityType: "User",
        entityId: userId,
        metadata: { timestamp: new Date().toISOString() },
      },
    });

    return {
      success: true,
      message: "Successfully logged out.",
    };
  }

  /**
   * Helper to verify if an email belongs to a candidate who has completed the recruitment assessment.
   * Throws 409 Conflict with code 'ASSESSMENT_ALREADY_COMPLETED' if the candidate has completed.
   */
  async verifyCandidateNotCompleted(normalizedEmail: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        student: {
          include: {
            applications: {
              include: { recruitmentDrive: true },
              orderBy: { appliedAt: "desc" },
            },
          },
        },
      },
    });

    if (existingUser?.student?.applications?.length) {
      const activeDrive = await this.prisma.recruitmentDrive.findFirst({
        where: { status: DriveStatus.OPEN, position: "Marketing Executive" },
        orderBy: { registrationEnd: "desc" },
      });

      const driveApplication = activeDrive
        ? existingUser.student.applications.find(
            (app) => app.recruitmentDriveId === activeDrive.id,
          )
        : existingUser.student.applications[0];

      if (driveApplication) {
        const completedStatuses: ApplicationStatus[] = [
          ApplicationStatus.QUALIFIED,
          ApplicationStatus.COMMUNICATION_FAILED,
          ApplicationStatus.COMMUNICATION_PASSED,
          ApplicationStatus.APTITUDE_FAILED,
        ];

        if (completedStatuses.includes(driveApplication.currentStatus)) {
          this.logger.warn(
            `Blocked attempt by completed candidate: ${normalizedEmail} (Status: ${driveApplication.currentStatus})`,
          );
          throw new ConflictException({
            statusCode: 409,
            code: "ASSESSMENT_ALREADY_COMPLETED",
            error: "Conflict",
            message:
              "This email address has already completed the Marketing Executive recruitment assessment. Thank you for participating.",
          });
        }
      }
    }
  }

  /**
   * Request OTP for student candidate registration / authentication.
   */
  async requestStudentOtp(dto: RequestOtpDto) {
    const normalizedEmail = (dto.email || "").trim().toLowerCase();
    const normalizedName = (dto.fullName || "").trim().replace(/\s+/g, " ");
    const normalizedStudentId = (dto.studentId || "").trim();
    const normalizedPhone = (dto.phone || "").replace(/\D/g, "");

    // 0a. Backend Validation Guards (Requirement 7)
    if (!normalizedName || !/^[a-zA-Z\s]{2,}$/.test(normalizedName)) {
      throw new BadRequestException("Please enter a valid name.");
    }

    if (!normalizedStudentId) {
      throw new BadRequestException("Please enter your Student ID.");
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      throw new BadRequestException("Please enter a valid email address.");
    }

    if (!normalizedPhone || !/^[6-9]\d{9}$/.test(normalizedPhone)) {
      throw new BadRequestException("Please enter a valid 10-digit mobile number.");
    }

    // 0b. Completed candidate check (Requirement 6, 7, 8, 10, 14, 15)
    await this.verifyCandidateNotCompleted(normalizedEmail);

    // 0c. Unique Student ID check within the active recruitment drive (Requirement 2 & 8)
    const activeDrive = await this.prisma.recruitmentDrive.findFirst({
      where: {
        status: DriveStatus.OPEN,
        position: "Marketing Executive",
      },
      orderBy: { registrationEnd: "desc" },
    });

    if (activeDrive) {
      const existingStudentWithId = await this.prisma.student.findFirst({
        where: {
          studentId: normalizedStudentId,
          email: { not: normalizedEmail },
        },
        include: {
          applications: {
            where: { recruitmentDriveId: activeDrive.id },
          },
        },
      });

      if (existingStudentWithId && existingStudentWithId.applications.length > 0) {
        throw new BadRequestException("This Student ID is already registered.");
      }
    }

    // 1. Rate limiting / resend cooldown check (60 seconds)
    const existingOtp = await this.prisma.studentOtp.findFirst({
      where: { email: normalizedEmail },
      orderBy: { createdAt: "desc" },
    });

    if (existingOtp) {
      const timeSinceLastSent =
        (Date.now() - existingOtp.lastSentAt.getTime()) / 1000;
      if (timeSinceLastSent < 60) {
        const remaining = Math.ceil(60 - timeSinceLastSent);
        throw new BadRequestException(
          `Please wait ${remaining} seconds before requesting a new verification code.`,
        );
      }
    }

    // 2. Generate secure 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Attempt SMTP send BEFORE storing OTP (Section 6 Required Flow):
    // Generate OTP -> Attempt SMTP send -> SUCCESS -> Store OTP/session information -> Return success
    // If SMTP send fails: Return an appropriate server error. Do NOT tell student "OTP sent successfully".
    try {
      await this.emailService.sendOtp(
        normalizedEmail,
        normalizedName,
        otp,
        10,
      );
    } catch (emailError: any) {
      this.logger.error(
        `SMTP email dispatch failed for student ${normalizedEmail}: ${emailError?.message}`,
      );
      throw new BadGatewayException(
        "We couldn't send the verification code. Please try again.",
      );
    }

    const detailsPayload: any = {
      fullName: normalizedName,
      studentId: normalizedStudentId,
      email: normalizedEmail,
      phone: normalizedPhone,
      collegeName: dto.collegeName?.trim() || null,
      course: dto.course?.trim() || null,
      department: dto.department?.trim() || null,
      graduationYear: dto.graduationYear ? Number(dto.graduationYear) : null,
    };

    // 4. Store OTP / session details ONLY AFTER SMTP SEND SUCCEEDS
    if (existingOtp) {
      const prevDetails = (existingOtp.details as any) || {};
      await this.prisma.studentOtp.update({
        where: { id: existingOtp.id },
        data: {
          otpHash,
          details: {
            ...prevDetails,
            ...detailsPayload,
            studentId: detailsPayload.studentId || prevDetails.studentId || "",
            fullName: detailsPayload.fullName || prevDetails.fullName || "Candidate",
            phone: detailsPayload.phone || prevDetails.phone || "",
          },
          attempts: 0,
          resendCount: existingOtp.resendCount + 1,
          lastSentAt: new Date(),
          expiresAt,
        },
      });
    } else {
      await this.prisma.studentOtp.create({
        data: {
          email: normalizedEmail,
          otpHash,
          details: detailsPayload,
          attempts: 0,
          resendCount: 1,
          lastSentAt: new Date(),
          expiresAt,
        },
      });
    }

    // 5. Return confirmation without exposing OTP in response
    return {
      success: true,
      message: "OTP sent successfully.",
      email: normalizedEmail,
      expiresInSeconds: 600,
    };
  }

  /**
   * Verifies candidate 6-digit OTP and establishes authenticated session.
   */
  async verifyStudentOtp(dto: VerifyOtpDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 0. Completed candidate check (Requirement 6, 7, 8, 10, 14, 15)
    await this.verifyCandidateNotCompleted(normalizedEmail);

    // 1. Find OTP record
    const otpRecord = await this.prisma.studentOtp.findFirst({
      where: { email: normalizedEmail },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw new BadRequestException(
        "No pending verification found for this email. Please request a code first.",
      );
    }

    if (new Date() > otpRecord.expiresAt) {
      await this.prisma.studentOtp.delete({ where: { id: otpRecord.id } });
      throw new BadRequestException(
        "Verification code has expired. Please request a new code.",
      );
    }

    // 2. Enforce maximum attempt limit (5 attempts)
    if (otpRecord.attempts >= 5) {
      await this.prisma.studentOtp.delete({ where: { id: otpRecord.id } });
      throw new UnauthorizedException(
        "Maximum verification attempts exceeded. Please request a new code.",
      );
    }

    // 3. Verify OTP hash
    const isValid = await bcrypt.compare(dto.otp, otpRecord.otpHash);
    if (!isValid) {
      const newAttempts = otpRecord.attempts + 1;
      await this.prisma.studentOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: newAttempts },
      });
      const remaining = 5 - newAttempts;
      throw new UnauthorizedException(
        `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
      );
    }

    // 4. Candidate details
    const details = (otpRecord.details as any) || {};

    // 5. Upsert User & Student Profile, associate with active drive in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Find or create User
      let user = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        const dummyPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: dummyPasswordHash,
            role: Role.STUDENT,
            isActive: true,
          },
        });
      } else if (!user.isActive) {
        throw new UnauthorizedException(
          "Account has been deactivated. Please contact administration.",
        );
      }

      // Find or create/update Student Profile
      let student = await tx.student.findUnique({
        where: { userId: user.id },
      });

      if (!student) {
        student = await tx.student.create({
          data: {
            userId: user.id,
            studentId: details.studentId || null,
            fullName: details.fullName || "",
            email: normalizedEmail,
            phone: details.phone || "",
            collegeName: details.collegeName || null,
            course: details.course || null,
            department: details.department || null,
            graduationYear: details.graduationYear ? Number(details.graduationYear) : null,
          },
        });
      } else if (details.fullName || details.studentId) {
        student = await tx.student.update({
          where: { id: student.id },
          data: {
            studentId: details.studentId || student.studentId,
            fullName: details.fullName || student.fullName,
            phone: details.phone || student.phone,
            collegeName: details.collegeName !== undefined ? details.collegeName : student.collegeName,
            course: details.course !== undefined ? details.course : student.course,
            department: details.department !== undefined ? details.department : student.department,
            graduationYear: details.graduationYear !== undefined ? (details.graduationYear ? Number(details.graduationYear) : null) : student.graduationYear,
          },
        });
      }

      // Automatically associate with active Marketing Executive recruitment drive
      const activeDrive = await tx.recruitmentDrive.findFirst({
        where: {
          status: DriveStatus.OPEN,
          position: "Marketing Executive",
        },
        orderBy: { registrationEnd: "desc" },
      });

      let application = null;
      let round1Assessment = null;

      if (activeDrive) {
        application = await tx.application.findUnique({
          where: {
            studentId_recruitmentDriveId: {
              studentId: student.id,
              recruitmentDriveId: activeDrive.id,
            },
          },
          include: {
            recruitmentDrive: {
              select: { id: true, name: true, position: true },
            },
          },
        });

        if (!application) {
          application = await tx.application.create({
            data: {
              studentId: student.id,
              recruitmentDriveId: activeDrive.id,
              currentStatus: ApplicationStatus.APTITUDE_PENDING,
            },
            include: {
              recruitmentDrive: {
                select: { id: true, name: true, position: true },
              },
            },
          });
        }

        round1Assessment = await tx.assessment.findFirst({
          where: {
            recruitmentDriveId: activeDrive.id,
            type: AssessmentType.APTITUDE,
            isActive: true,
          },
          include: {
            _count: {
              select: { questions: true },
            },
          },
        });
      }

      // Invalidate consumed OTP
      await tx.studentOtp.delete({ where: { id: otpRecord.id } });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "STUDENT_OTP_VERIFIED",
          entityType: "Student",
          entityId: student.id,
          metadata: {
            email: normalizedEmail,
            applicationId: application?.id,
            status: application?.currentStatus,
          },
        },
      });

      return { user, student, application, activeDrive, round1Assessment };
    });

    const safeUser: SafeUser = {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      isActive: result.user.isActive,
      createdAt: result.user.createdAt,
    };

    const accessToken = this.generateToken(safeUser);

    // Map internal status to candidate friendly status
    const statusLabels: Record<string, string> = {
      REGISTERED: "Registration Confirmed",
      APTITUDE_PENDING: "Your Aptitude Assessment is ready.",
      APTITUDE_IN_PROGRESS: "Your Aptitude Assessment is in progress.",
      APTITUDE_PASSED: "Round 1 Aptitude Assessment Passed.",
      APTITUDE_FAILED: "Round 1 Completed.",
      ADMIN_REVIEW: "Application under administrative review.",
      ADMIN_APPROVED: "Approved for next stage.",
      COMMUNICATION_PENDING: "Round 2 Communication Assessment is ready.",
      COMMUNICATION_IN_PROGRESS: "Round 2 is in progress.",
      COMMUNICATION_PASSED: "Round 2 Passed.",
      COMMUNICATION_FAILED: "Round 2 Completed.",
      QUALIFIED: "Congratulations! You are Qualified.",
    };

    const currentStatus =
      result.application?.currentStatus || ApplicationStatus.APTITUDE_PENDING;
    const statusLabel =
      statusLabels[currentStatus] || "Your Aptitude Assessment is ready.";

    return {
      accessToken,
      user: safeUser,
      student: {
        id: result.student.id,
        studentId: result.student.studentId,
        fullName: result.student.fullName,
        email: result.student.email,
        phone: result.student.phone,
        collegeName: result.student.collegeName,
        course: result.student.course,
        department: result.student.department,
        graduationYear: result.student.graduationYear,
      },
      application: result.application
        ? {
            id: result.application.id,
            currentStatus,
            statusLabel,
            driveName:
              result.activeDrive?.name ||
              "Marketing Executive Campus Drive 2026",
          }
        : null,
      assessment: {
        id: result.round1Assessment?.id || null,
        title: result.round1Assessment?.title || "Round 1: Aptitude Assessment",
        roundName: "Round 1 — Aptitude Assessment",
        durationMinutes: result.round1Assessment?.durationMinutes || 15,
        passPercentage: result.round1Assessment?.passPercentage || 80,
        questionCount: result.round1Assessment?._count?.questions || 10,
      },
    };
  }

  private generateToken(user: SafeUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
