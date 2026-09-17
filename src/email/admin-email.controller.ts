import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { EmailService } from "./email.service";
import { JwtAuthGuard } from "../modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../modules/auth/guards/roles.guard";
import { Roles } from "../modules/auth/decorators/roles.decorator";
import { Role } from "@prisma/client";

@Controller("admin/email")
export class AdminEmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Development-only email test endpoint.
   * POST /api/admin/email/test
   *
   * Security & Constraints (Section 12):
   * - ADMIN authentication required.
   * - Only enable this endpoint in development/testing.
   * - Do not expose SMTP credentials.
   * - Do not expose it publicly in production.
   * - Indicates whether the SMTP send succeeded or failed.
   */
  @Post("test")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Body("to") to: string) {
    // Only enable this endpoint in development / testing environments
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException(
        "Development SMTP test endpoint is disabled in production.",
      );
    }

    if (!to || !to.includes("@")) {
      throw new BadRequestException(
        "A valid recipient email ('to') is required.",
      );
    }

    const result = await this.emailService.sendTestEmail(to.trim().toLowerCase());
    return {
      messageId: result.messageId || null,
      accepted: result.accepted || [],
      rejected: result.rejected || [],
      response: result.response || result.message,
    };
  }
}
