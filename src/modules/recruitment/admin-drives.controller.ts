import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { RecruitmentService } from "./recruitment.service";
import { CreateDriveDto } from "./dto/create-drive.dto";
import { UpdateDriveDto } from "./dto/update-drive.dto";
import { UpdateDriveStatusDto } from "./dto/update-drive-status.dto";
import { DriveQueryDto } from "./dto/drive-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@prisma/client";
import { SafeUser } from "../auth/types/auth.types";

@Controller("admin/drives")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDrivesController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  /**
   * Admin creates a new recruitment drive.
   * POST /api/admin/drives
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDrive(
    @Body() dto: CreateDriveDto,
    @CurrentUser() user: SafeUser,
  ) {
    const drive = await this.recruitmentService.createDrive(dto, user.id);
    return {
      data: drive,
      message: "Recruitment drive created successfully.",
    };
  }

  /**
   * Admin lists all recruitment drives with search and filtering.
   * GET /api/admin/drives
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listDrives(@Query() query: DriveQueryDto) {
    const result = await this.recruitmentService.listAdminDrives(query);
    return {
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      message: "Recruitment drives retrieved successfully.",
    };
  }

  /**
   * Admin retrieves a single drive by ID.
   * GET /api/admin/drives/:id
   */
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getDrive(@Param("id") id: string) {
    const drive = await this.recruitmentService.getAdminDriveById(id);
    return {
      data: drive,
      message: "Drive details retrieved successfully.",
    };
  }

  /**
   * Admin updates drive details.
   * PATCH /api/admin/drives/:id
   */
  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  async updateDrive(
    @Param("id") id: string,
    @Body() dto: UpdateDriveDto,
    @CurrentUser() user: SafeUser,
  ) {
    const drive = await this.recruitmentService.updateDrive(id, dto, user.id);
    return {
      data: drive,
      message: "Recruitment drive updated successfully.",
    };
  }

  /**
   * Admin explicitly updates drive status (OPEN, CLOSED, ARCHIVED, DRAFT).
   * PATCH /api/admin/drives/:id/status
   */
  @Patch(":id/status")
  @HttpCode(HttpStatus.OK)
  async updateDriveStatus(
    @Param("id") id: string,
    @Body() dto: UpdateDriveStatusDto,
    @CurrentUser() user: SafeUser,
  ) {
    const drive = await this.recruitmentService.updateDriveStatus(
      id,
      dto.status,
      user.id,
    );
    return {
      data: drive,
      message: `Recruitment drive status successfully updated to ${dto.status}.`,
    };
  }
}
