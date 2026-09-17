import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { EmailService } from "./email.service";
import { JwtAuthGuard } from "../modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../modules/auth/guards/roles.guard";
import { Roles } from "../modules/auth/decorators/roles.decorator";
import { Role } from "@prisma/client";

@Controller("email")
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Safe SMTP connectivity and authentication check.
   * Tests SSL/TLS connection on port 465 without exposing credentials.
   * GET /api/email/verify-smtp
   */
  @Get("verify-smtp")
  @HttpCode(HttpStatus.OK)
  async verifySmtp() {
    return this.emailService.verifySmtpConnection();
  }

  /**
   * Admin-authenticated test email dispatcher.
   * POST /api/email/send-test
   */
  @Post("send-test")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Body("to") to: string) {
    if (!to) {
      return { success: false, message: "Recipient email is required." };
    }

    const success = await this.emailService.sendEmail({
      to,
      subject: "Marketing Executive SMTP Test",
      text: "This is a test email from the Marketing Executive Recruitment Application.",
      html: "<p>This is a test email from the Marketing Executive Recruitment Application.</p>",
    });

    return {
      success,
      message: success
        ? `Email accepted by SMTP server for ${to}`
        : `Failed to send email to ${to}`,
    };
  }
}
