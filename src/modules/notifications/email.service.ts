import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: Record<string, unknown>;
}

export interface IEmailService {
  sendEmail(options: SendEmailOptions): Promise<boolean>;
}

export const EMAIL_SERVICE_TOKEN = "EMAIL_SERVICE_TOKEN";

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly provider: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>(
      "email.from",
      "recruitment@company.com",
    );
    this.provider = this.configService.get<string>("email.provider", "console");
    this.logger.log(
      `Email service initialized with provider: ${this.provider}, from: ${this.from}`,
    );
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    // Abstracted notification dispatch placeholder
    this.logger.log(
      `[Mock Email Dispatch] To: ${options.to} | Subject: "${options.subject}" | From: ${this.from}`,
    );
    return true;
  }
}
