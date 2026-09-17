import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Role } from "@prisma/client";
import { AuthResponse, SafeUser } from "./types/auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Candidate OTP Request
   * POST /api/auth/student/request-otp
   */
  @Post("student/request-otp")
  @HttpCode(HttpStatus.OK)
  async requestStudentOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestStudentOtp(dto);
  }

  /**
   * Candidate OTP Verification & Session Issuance
   * POST /api/auth/student/verify-otp
   */
  @Post("student/verify-otp")
  @HttpCode(HttpStatus.OK)
  async verifyStudentOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyStudentOtp(dto);
  }

  /**
   * Student Account Registration (Legacy)
   * POST /api/auth/student/register
   */
  @Post("student/register")
  @HttpCode(HttpStatus.CREATED)
  async registerStudent(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.registerStudent(dto);
  }

  /**
   * Student Login
   * POST /api/auth/student/login
   */
  @Post("student/login")
  @HttpCode(HttpStatus.OK)
  async studentLogin(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto, Role.STUDENT);
  }

  /**
   * Admin Login
   * POST /api/auth/admin/login
   */
  @Post("admin/login")
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto, Role.ADMIN);
  }

  /**
   * Current Authenticated User Session
   * GET /api/auth/me
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user: SafeUser): Promise<SafeUser> {
    return this.authService.getCurrentUser(user.id);
  }

  /**
   * User Session Logout
   * POST /api/auth/logout
   */
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: SafeUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.logout(user.id);
  }

  /**
   * Admin-Only Protected Endpoint (Guards verification)
   * GET /api/auth/admin-only
   */
  @Get("admin-only")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async adminOnlyCheck(@CurrentUser() user: SafeUser) {
    return {
      message: "Access granted to administrator endpoint.",
      user,
    };
  }

  /**
   * Student-Only Protected Endpoint (Guards verification)
   * GET /api/auth/student-only
   */
  @Get("student-only")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @HttpCode(HttpStatus.OK)
  async studentOnlyCheck(@CurrentUser() user: SafeUser) {
    return {
      message: "Access granted to student candidate endpoint.",
      user,
    };
  }
}
