import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { RecruitmentService } from "./recruitment.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@prisma/client";
import { SafeUser } from "../auth/types/auth.types";

@Controller("drives")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentDrivesController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  /**
   * Student views all available recruitment drives.
   * Only returns drives that are currently OPEN and within active registration dates.
   * GET /api/drives
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listAvailableDrives(@CurrentUser() user: SafeUser) {
    const drives = await this.recruitmentService.listAvailableDrives(user.id);
    return {
      data: drives,
      message: "Available recruitment drives retrieved successfully.",
    };
  }

  /**
   * Student views details of an available drive.
   * GET /api/drives/:id
   */
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getDriveDetails(
    @Param("id") id: string,
    @CurrentUser() user: SafeUser,
  ) {
    const drive = await this.recruitmentService.getAvailableDriveById(
      id,
      user.id,
    );
    return {
      data: drive,
      message: "Recruitment drive details retrieved successfully.",
    };
  }

  /**
   * Student applies for an open recruitment drive.
   * Enforces single application per drive, active dates, and sets status to REGISTERED.
   * POST /api/drives/:id/apply
   */
  @Post(":id/apply")
  @HttpCode(HttpStatus.CREATED)
  async applyToDrive(@Param("id") id: string, @CurrentUser() user: SafeUser) {
    return this.recruitmentService.applyToDrive(id, user.id);
  }
}
