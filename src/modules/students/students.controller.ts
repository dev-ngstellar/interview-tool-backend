import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { StudentsService } from "./students.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@prisma/client";
import { SafeUser } from "../auth/types/auth.types";

@Controller("student")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  /**
   * Retrieves authenticated student profile.
   * GET /api/student/profile
   */
  @Get("profile")
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: SafeUser) {
    const profile = await this.studentsService.getProfile(user.id);
    return {
      data: profile,
      message: "Student profile retrieved successfully.",
    };
  }

  /**
   * Updates authenticated student personal and academic details.
   * PATCH /api/student/profile
   */
  @Patch("profile")
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: SafeUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.studentsService.updateProfile(user.id, dto);
    return {
      data: profile,
      message: "Student profile updated successfully.",
    };
  }

  /**
   * Uploads resume file (PDF, DOC, DOCX, <= 5MB).
   * POST /api/student/profile/resume
   */
  @Post("profile/resume")
  @UseInterceptors(FileInterceptor("file"))
  @HttpCode(HttpStatus.OK)
  async uploadResume(
    @CurrentUser() user: SafeUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.studentsService.uploadResume(user.id, file);
  }

  /**
   * Securely downloads/streams candidate's own resume.
   * GET /api/student/profile/resume
   */
  @Get("profile/resume")
  async getResume(@CurrentUser() user: SafeUser, @Res() res: Response) {
    const { buffer, mimeType, fileName } = await this.studentsService.getResume(
      user.id,
    );

    res.set({
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Content-Length": buffer.length,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    res.send(buffer);
  }

  /**
   * Retrieves all recruitment applications for authenticated student.
   * GET /api/student/applications
   */
  @Get("applications")
  @HttpCode(HttpStatus.OK)
  async getApplications(@CurrentUser() user: SafeUser) {
    const applications = await this.studentsService.getApplications(user.id);
    return {
      data: applications,
      message: "Candidate applications retrieved successfully.",
    };
  }

  /**
   * Retrieves single application detail for authenticated student.
   * GET /api/student/applications/:id
   */
  @Get("applications/:id")
  @HttpCode(HttpStatus.OK)
  async getApplicationById(
    @Param("id") id: string,
    @CurrentUser() user: SafeUser,
  ) {
    const application = await this.studentsService.getApplicationById(
      id,
      user.id,
    );
    return {
      data: application,
      message: "Application details retrieved successfully.",
    };
  }

  /**
   * Retrieves final recruitment assessment evaluation results for student.
   * GET /api/student/final-result
   */
  @Get("final-result")
  @HttpCode(HttpStatus.OK)
  async getFinalResult(@CurrentUser() user: SafeUser) {
    return this.studentsService.getFinalResult(user.id);
  }
}
