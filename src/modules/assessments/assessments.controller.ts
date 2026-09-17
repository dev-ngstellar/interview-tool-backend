import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from "class-validator";
import { AssessmentsService } from "./assessments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@prisma/client";
import { SafeUser } from "../auth/types/auth.types";

export class SaveAnswerDto {
  @IsNotEmpty({ message: "questionId is required" })
  @IsString({ message: "questionId must be a string" })
  questionId: string;

  @IsNotEmpty({ message: "selectedOptionId is required" })
  @IsString({ message: "selectedOptionId must be a string" })
  selectedOptionId: string;

  @IsOptional()
  @IsBoolean({ message: "isFinalized must be a boolean" })
  isFinalized?: boolean;
}

export class SecurityEventDto {
  @IsNotEmpty({ message: "eventType is required" })
  @IsString({ message: "eventType must be a string" })
  eventType: string;

  @IsOptional()
  metadata?: any;
}

@Controller("assessments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  /**
   * Retrieves current assessment details and candidate eligibility without starting an attempt.
   * GET /api/assessments/current
   */
  @Get("current")
  @HttpCode(HttpStatus.OK)
  async getCurrentAssessment(@CurrentUser() user: SafeUser) {
    return this.assessmentsService.getCurrentAssessment(user.id);
  }

  /**
   * Starts a candidate assessment attempt or returns existing active attempt by assessmentId.
   * POST /api/assessments/:assessmentId/start
   */
  @Post(":assessmentId/start")
  @HttpCode(HttpStatus.OK)
  async startAssessmentWithId(
    @Param("assessmentId") assessmentId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.assessmentsService.startAssessment(assessmentId, user.id);
  }

  /**
   * Starts a candidate assessment attempt or returns existing active attempt (default).
   * POST /api/assessments/start
   */
  @Post("start")
  @HttpCode(HttpStatus.OK)
  async startAssessment(
    @CurrentUser() user: SafeUser,
  ) {
    return this.assessmentsService.startAssessment("default", user.id);
  }

  /**
   * Retrieves active attempt for student session by assessmentId.
   * GET /api/assessments/:assessmentId/active-attempt
   */
  @Get(":assessmentId/active-attempt")
  @HttpCode(HttpStatus.OK)
  async getActiveAttemptWithId(
    @Param("assessmentId") assessmentId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.assessmentsService.getActiveAttempt(assessmentId, user.id);
  }

  /**
   * Retrieves active attempt for student session (default).
   * GET /api/assessments/active-attempt
   */
  @Get("active-attempt")
  @HttpCode(HttpStatus.OK)
  async getActiveAttempt(
    @CurrentUser() user: SafeUser,
  ) {
    return this.assessmentsService.getActiveAttempt("default", user.id);
  }

  /**
   * Retrieves questions by assessmentId directly.
   * GET /api/assessments/:assessmentId/questions
   */
  @Get(":assessmentId/questions")
  @HttpCode(HttpStatus.OK)
  async getAssessmentQuestions(
    @Param("assessmentId") assessmentId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.assessmentsService.getAssessmentQuestions(assessmentId, user.id);
  }

  /**
   * Retrieves questions directly (default).
   * GET /api/assessments/questions
   */
  @Get("questions")
  @HttpCode(HttpStatus.OK)
  async getQuestionsDefault(
    @CurrentUser() user: SafeUser,
  ) {
    return this.assessmentsService.getAssessmentQuestions("default", user.id);
  }

  /**
   * Retrieves 15 safe questions and previously saved answers for candidate's attempt.
   * GET /api/assessments/attempts/:attemptId/questions
   */
  @Get("attempts/:attemptId/questions")
  @HttpCode(HttpStatus.OK)
  async getAttemptQuestions(
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.assessmentsService.getAttemptQuestions(attemptId, user.id);
  }

  /**
   * Persists an answer selected by the candidate during the assessment.
   * POST / PUT / PATCH /api/assessments/attempts/:attemptId/answers
   */
  @Post("attempts/:attemptId/answers")
  @Put("attempts/:attemptId/answers")
  @Patch("attempts/:attemptId/answers")
  @HttpCode(HttpStatus.OK)
  async saveAnswer(
    @Param("attemptId") attemptId: string,
    @Body() body: SaveAnswerDto,
    @CurrentUser() user: SafeUser,
  ) {
    if (!body?.questionId || typeof body.questionId !== "string" || !body.questionId.trim()) {
      throw new BadRequestException("questionId is required and must be a non-empty string.");
    }
    if (!body?.selectedOptionId || typeof body.selectedOptionId !== "string" || !body.selectedOptionId.trim()) {
      throw new BadRequestException("selectedOptionId is required and must be a non-empty string.");
    }
    return this.assessmentsService.saveAnswer(
      attemptId,
      body.questionId.trim(),
      body.selectedOptionId.trim(),
      user.id,
      body.isFinalized,
    );
  }

  /**
   * Submits or locks assessment attempt and performs server-side scoring.
   * POST /api/assessments/attempts/:attemptId/submit
   */
  @Post("attempts/:attemptId/submit")
  @HttpCode(HttpStatus.OK)
  async submitAttempt(
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.assessmentsService.submitAttempt(attemptId, user.id);
  }

  /**
   * Records a security violation or exam environment event for an active attempt.
   * POST /api/assessments/attempts/:attemptId/security-event
   */
  @Post("attempts/:attemptId/security-event")
  @HttpCode(HttpStatus.OK)
  async logSecurityEvent(
    @Param("attemptId") attemptId: string,
    @Body() body: SecurityEventDto,
    @CurrentUser() user: SafeUser,
  ) {
    if (!body?.eventType || typeof body.eventType !== "string" || !body.eventType.trim()) {
      throw new BadRequestException("eventType is required and must be a non-empty string.");
    }
    return this.assessmentsService.logSecurityEvent(
      attemptId,
      body.eventType.trim(),
      user.id,
      body.metadata,
    );
  }

  /**
   * Retrieves evaluated score card result for an attempt.
   * GET /api/assessments/attempts/:attemptId/result
   */
  @Get("attempts/:attemptId/result")
  @HttpCode(HttpStatus.OK)
  async getAttemptResult(
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.assessmentsService.getAttemptResult(attemptId, user.id);
  }

  /**
   * Retrieves specific attempt by attemptId.
   * GET /api/assessments/attempts/:attemptId
   */
  @Get("attempts/:attemptId")
  @HttpCode(HttpStatus.OK)
  async getAttemptById(
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.assessmentsService.getAttemptQuestions(attemptId, user.id);
  }

  /**
   * Validates Round 2 access for candidate.
   * Enforces 403 Forbidden for candidates with APTITUDE_FAILED.
   * GET /api/assessments/round-2
   */
  @Get("round-2")
  @HttpCode(HttpStatus.OK)
  async checkRound2Access(@CurrentUser() user: SafeUser) {
    return this.assessmentsService.checkRound2Access(user.id);
  }

  /**
   * Validates Round 2 access alias.
   * GET /api/assessments/round-2/access
   */
  @Get("round-2/access")
  @HttpCode(HttpStatus.OK)
  async checkRound2AccessAlias(@CurrentUser() user: SafeUser) {
    return this.assessmentsService.checkRound2Access(user.id);
  }

  /**
   * Retrieves final evaluation results across all rounds for candidate.
   * GET /api/assessments/final-result
   */
  @Get("final-result")
  @HttpCode(HttpStatus.OK)
  async getFinalResult(@CurrentUser() user: SafeUser) {
    return this.assessmentsService.getFinalResult(user.id);
  }
}
