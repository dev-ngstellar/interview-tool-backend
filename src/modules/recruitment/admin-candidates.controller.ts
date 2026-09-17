import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { RecruitmentService } from "./recruitment.service";
import { AdminCandidateQueryDto } from "./dto/admin-candidate-query.dto";
import { AdminOverrideDto, BulkAdminOverrideDto } from "./dto/admin-override.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@prisma/client";
import { SafeUser } from "../auth/types/auth.types";

@Controller("admin/candidates")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminCandidatesController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  /**
   * Retrieves comprehensive recruitment metrics for the Admin Dashboard.
   * GET /api/admin/candidates/dashboard-stats
   */
  @Get("dashboard-stats")
  @HttpCode(HttpStatus.OK)
  async getDashboardStats() {
    const data = await this.recruitmentService.getDashboardStats();
    return {
      data,
      message: "Recruitment dashboard metrics retrieved successfully.",
    };
  }

  /**
   * Retrieves paginated candidate applications with search, filtering, and sorting.
   * GET /api/admin/candidates
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listCandidates(@Query() query: AdminCandidateQueryDto) {
    const result = await this.recruitmentService.listCandidates(query);
    return {
      data: result.candidates,
      pagination: result.pagination,
      message: "Candidates retrieved successfully.",
    };
  }

  /**
   * Retrieves single candidate details, assessment breakdowns, and audit trail.
   * GET /api/admin/candidates/:id
   */
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getCandidateDetails(@Param("id") applicationId: string) {
    const candidate = await this.recruitmentService.getCandidateDetails(applicationId);
    return {
      data: candidate,
      message: "Candidate details retrieved successfully.",
    };
  }

  /**
   * Manually overrides a Round 1 failed candidate, approving them for Round 2.
   * Creates an audited AdminApproval record without modifying original score.
   * POST /api/admin/candidates/:id/override-round-2
   */
  @Post(":id/override-round-2")
  @HttpCode(HttpStatus.OK)
  async overrideRound2(
    @Param("id") applicationId: string,
    @Body() dto: AdminOverrideDto,
    @CurrentUser() adminUser: SafeUser,
  ) {
    const result = await this.recruitmentService.overrideRound2(
      applicationId,
      adminUser.id,
      dto.reason,
      dto.remarks,
    );
    return {
      data: result,
      message: result.message,
    };
  }

  /**
   * Bulk overrides multiple Round 1 failed candidates for Round 2.
   * POST /api/admin/candidates/bulk-override-round-2
   */
  @Post("bulk-override-round-2")
  @HttpCode(HttpStatus.OK)
  async bulkOverrideRound2(
    @Body() dto: BulkAdminOverrideDto,
    @CurrentUser() adminUser: SafeUser,
  ) {
    const result = await this.recruitmentService.bulkOverrideRound2(
      dto.applicationIds,
      adminUser.id,
      dto.reason,
      dto.remarks,
    );
    return {
      data: result,
      message: result.message,
    };
  }
}
