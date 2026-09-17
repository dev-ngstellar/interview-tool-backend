import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";
import { EmailStatus } from "@prisma/client";
import * as nodemailer from "nodemailer";
import { getSmtpConfig, SmtpConfig } from "./email.config";
import { renderOtpEmail } from "./templates/otp.template";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private smtpConfig: SmtpConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.smtpConfig = getSmtpConfig();
    this.initializeTransporter();
  }

  async onModuleInit(): Promise<void> {
    // 1. Safely log environment variables without exposing password (Section 1)
    this.logSmtpDiagnostics();

    // 2. Credential check (Section 1)
    if (!this.smtpConfig.pass) {
      this.logger.error("SMTP_PASSWORD is missing.");
      return;
    }

    // 3. Direct SMTP authentication check at startup (Section 2 & 7)
    if (process.env.NODE_ENV !== "production") {
      const verification = await this.verifySmtpConnection();
      if (verification.success) {
        this.logger.log("SMTP connection successful");
        this.logger.log("SMTP authentication successful");
      } else {
        if (verification.code === "EAUTH") {
          this.logAuthFailure(verification.code);
          this.logger.error(
            `SMTP authentication failed (Code: ${verification.code}): ${verification.error || "Invalid credentials"}`,
          );
        } else {
          this.logger.error(
            `SMTP connection failed (Error: ${verification.error})`,
          );
        }
      }
    }
  }

  /**
   * Safely logs SMTP environment status without exposing password (Section 1).
   */
  public logSmtpDiagnostics(): void {
    this.logger.log(`SMTP Host: ${this.smtpConfig.host}`);
    this.logger.log(`SMTP Port: ${this.smtpConfig.port}`);
    this.logger.log(`SMTP Secure: ${this.smtpConfig.secure}`);
    this.logger.log(`SMTP User: ${this.smtpConfig.user}`);
    this.logger.log(
      `SMTP Password: ${this.smtpConfig.pass ? "CONFIGURED" : "MISSING"}`,
    );
    this.logger.log(
      `SMTP From: ${this.smtpConfig.fromEmail || this.smtpConfig.user}`,
    );

    if (!this.smtpConfig.pass) {
      this.logger.error("SMTP_PASSWORD is missing.");
    }
  }

  /**
   * Safely logs SMTP authentication failure details without secrets (Section 6).
   */
  private logAuthFailure(errorCode = "EAUTH"): void {
    this.logger.error("SMTP authentication failed");
    this.logger.error(`Code: ${errorCode}`);
    this.logger.error(`Host: ${this.smtpConfig.host}`);
    this.logger.error(`Port: ${this.smtpConfig.port}`);
    this.logger.error(`Secure: ${this.smtpConfig.secure}`);
    this.logger.error(`User: ${this.smtpConfig.user}`);
  }

  /**
   * Safely captures and logs SMTP response details without exposing secrets.
   * Format:
   * Email accepted by SMTP server
   * Message ID: <...>
   * Accepted: [...]
   * Rejected: [...]
   * Response: ...
   * Never logs OTP, passwords, or authentication tokens.
   */
  public logSafeSmtpResponse(
    sendResult: nodemailer.SentMessageInfo,
    recipient?: string,
  ): void {
    const accepted = Array.isArray(sendResult?.accepted)
      ? sendResult.accepted.map((r: any) => String(r))
      : [];
    const rejected = Array.isArray(sendResult?.rejected)
      ? sendResult.rejected.map((r: any) => String(r))
      : [];

    this.logger.log("Email accepted by SMTP server");
    this.logger.log(`Message ID: ${sendResult?.messageId || "N/A"}`);
    this.logger.log(`Accepted: ${JSON.stringify(accepted)}`);
    this.logger.log(`Rejected: ${JSON.stringify(rejected)}`);
    this.logger.log(`Response: ${sendResult?.response || "N/A"}`);

    if (recipient) {
      if (rejected.includes(recipient)) {
        this.logger.error(`SMTP server rejected recipient: ${recipient}`);
      } else if (accepted.includes(recipient)) {
        this.logger.log("SMTP accepted recipient.");
      }
    }
  }

  /**
   * Categorizes low-level nodemailer / network errors into safe human-readable descriptions.
   * NEVER exposes credentials or passwords in log messages.
   */
  public categorizeSmtpError(error: any): string {
    const msg = (error?.message || "").toLowerCase();
    const code = (error?.code || "").toUpperCase();
    const response = (error?.response || "").toLowerCase();

    if (
      code === "EAUTH" ||
      error?.responseCode === 535 ||
      msg.includes("auth") ||
      msg.includes("invalid login") ||
      msg.includes("535")
    ) {
      return "SMTP server rejected the supplied credentials.";
    }
    if (
      code === "ETIMEDOUT" ||
      msg.includes("timeout") ||
      msg.includes("etimedout")
    ) {
      return "SMTP connection timeout";
    }
    if (
      code === "ECONNREFUSED" ||
      code === "ECONNRESET" ||
      msg.includes("refused") ||
      msg.includes("econnection")
    ) {
      return "SMTP connection refused";
    }
    if (
      msg.includes("tls") ||
      msg.includes("ssl") ||
      msg.includes("handshake") ||
      code.includes("TLS")
    ) {
      return "SMTP TLS error";
    }
    if (
      msg.includes("sender") ||
      response.includes("sender") ||
      msg.includes("550") ||
      msg.includes("553")
    ) {
      return "SMTP rejected sender";
    }
    if (
      msg.includes("mailbox") ||
      response.includes("recipient") ||
      msg.includes("551") ||
      msg.includes("552")
    ) {
      return "SMTP mailbox unavailable";
    }
    return error?.message || "SMTP connection failed";
  }

  private initializeTransporter(): void {
    if (!this.smtpConfig.host) {
      this.logger.error("SMTP_HOST not configured.");
      return;
    }

    try {
      // Port 465 requires implicit SSL/TLS SMTP connection (secure: true)
      this.transporter = nodemailer.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: this.smtpConfig.secure, // true for port 465 SSL/TLS
        auth: {
          user: this.smtpConfig.user,
          pass: this.smtpConfig.pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    } catch (err: any) {
      const safeErr = this.categorizeSmtpError(err);
      this.logger.error(`Failed to initialize SMTP transporter: ${safeErr}`);
    }
  }

  /**
   * Sends 6-digit verification code to candidate using Gmail SMTP and records EmailLog.
   *
   * REQUIRED FLOW:
   * 1. Check SMTP_PASSWORD exists.
   * 2. Verify SMTP transporter during development before sending.
   * 3. Send to exact candidate email.
   * 4. On success: record EmailLog with status = SENT, return true.
   * 5. On failure: record EmailLog with status = FAILED, throw error.
   */
  async sendOtp(
    to: string,
    candidateName: string,
    otp: string,
    expiryMinutes = 10,
  ): Promise<boolean> {
    const isDev = process.env.NODE_ENV !== "production";

    // 1. Fail immediately if password is missing (Section 8)
    if (!this.smtpConfig.pass) {
      const errMsg = "SMTP_PASSWORD is not configured";
      this.logger.error(errMsg);

      await this.prisma.emailLog.create({
        data: {
          recipient: to,
          subject: "Your Marketing Executive Recruitment Verification Code",
          template: "OTP_VERIFICATION",
          status: EmailStatus.FAILED,
          errorMessage: errMsg,
        },
      });

      throw new Error(errMsg);
    }

    const { subject, text, html } = renderOtpEmail({
      candidateName,
      otp,
      expiryMinutes,
    });

    // 2. Logging rule: Log recipient safely before sending; do NOT log OTP in production
    this.logger.log(`OTP recipient: ${to}`);

    const allowDevOtpLog = process.env.ENABLE_DEV_OTP_LOG === "true";
    if (isDev && allowDevOtpLog) {
      this.logger.log(`[DEV OTP LOG] Verification code for ${to}: ${otp}`);
    }

    // 3. Ensure transporter is active
    if (!this.transporter) {
      this.initializeTransporter();
    }

    if (!this.transporter) {
      const initError = "SMTP connection failed";
      this.logger.error(initError);

      await this.prisma.emailLog.create({
        data: {
          recipient: to,
          subject,
          template: "OTP_VERIFICATION",
          status: EmailStatus.FAILED,
          errorMessage: initError,
        },
      });

      throw new Error(initError);
    }

    // 4. Verify SMTP transporter before sending during development (Section 6)
    if (isDev) {
      try {
        await this.transporter.verify();
        this.logger.log("SMTP connection successful");
      } catch (verifyErr: any) {
        const isAuthError =
          verifyErr?.code === "EAUTH" ||
          verifyErr?.responseCode === 535 ||
          (verifyErr?.message || "").toLowerCase().includes("auth");

        if (isAuthError) {
          this.logAuthFailure(verifyErr?.code || "EAUTH");

          await this.prisma.emailLog.create({
            data: {
              recipient: to,
              subject,
              template: "OTP_VERIFICATION",
              status: EmailStatus.FAILED,
              errorMessage:
                "SMTP server rejected the supplied credentials.",
            },
          });

          this.logger.error(
            "SMTP server rejected the supplied credentials.",
          );
          throw new Error(
            "SMTP server rejected the supplied credentials.",
          );
        } else {
          const safeCategory = this.categorizeSmtpError(verifyErr);
          this.logger.error(
            `SMTP connection failed: ${safeCategory} (Code: ${verifyErr?.code || "UNKNOWN"})`,
          );

          await this.prisma.emailLog.create({
            data: {
              recipient: to,
              subject,
              template: "OTP_VERIFICATION",
              status: EmailStatus.FAILED,
              errorMessage: safeCategory,
            },
          });

          throw new Error(safeCategory);
        }
      }
    }

    // 5. Attempt SMTP delivery to the exact student recipient
    try {
      const senderAddress = this.smtpConfig.fromEmail || this.smtpConfig.user;
      const from = `"${this.smtpConfig.fromName}" <${senderAddress}>`;
      const sendResult = await this.transporter.sendMail({
        from,
        to,
        envelope: {
          from: senderAddress,
          to,
        },
        subject,
        text,
        html,
      });

      // Log safe SMTP response details (Sections 1, 5, 9)
      this.logSafeSmtpResponse(sendResult, to);

      // Verify SMTP server response
      const rejected =
        Array.isArray(sendResult.rejected) &&
        sendResult.rejected.map((r: any) => String(r)).includes(to);

      if (rejected) {
        throw new Error(`SMTP server rejected recipient: ${to}`);
      }

      // Record successful EmailLog only after sendMail succeeds (Section 6)
      await this.prisma.emailLog.create({
        data: {
          recipient: to,
          subject,
          template: "OTP_VERIFICATION",
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });

      return true;
    } catch (error: any) {
      const isAuthError =
        error?.code === "EAUTH" ||
        error?.responseCode === 535 ||
        (error?.message || "").toLowerCase().includes("auth");

      let safeErrorMessage: string;
      if (isAuthError) {
        this.logAuthFailure(error?.code || "EAUTH");
        this.logger.error(
          "SMTP server rejected the supplied credentials.",
        );
        safeErrorMessage =
          "SMTP server rejected the supplied credentials.";
      } else {
        safeErrorMessage = this.categorizeSmtpError(error);
        this.logger.error(
          `Failed to send OTP email to ${to} via SMTP: ${safeErrorMessage} (Code: ${error?.code || "UNKNOWN"})`,
        );
      }

      // Record failed EmailLog without exposing secrets (Section 11)
      await this.prisma.emailLog.create({
        data: {
          recipient: to,
          subject,
          template: "OTP_VERIFICATION",
          status: EmailStatus.FAILED,
          errorMessage: safeErrorMessage,
        },
      });

      throw new Error(safeErrorMessage);
    }
  }

  /**
   * Generic email dispatch supporting subsequent recruitment stages.
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.smtpConfig.pass || !this.transporter) {
      this.logger.error("Cannot dispatch email: SMTP not configured.");
      await this.prisma.emailLog.create({
        data: {
          recipient: options.to,
          subject: options.subject,
          template: options.template || "GENERAL",
          status: EmailStatus.FAILED,
          errorMessage: "SMTP_PASSWORD is not configured",
        },
      });
      return false;
    }

    try {
      const senderAddress = this.smtpConfig.fromEmail || this.smtpConfig.user;
      const from = `"${this.smtpConfig.fromName}" <${senderAddress}>`;
      const sendResult = await this.transporter.sendMail({
        from,
        to: options.to,
        envelope: {
          from: senderAddress,
          to: options.to,
        },
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logSafeSmtpResponse(sendResult, options.to);

      const rejected =
        Array.isArray(sendResult.rejected) &&
        sendResult.rejected.map((r: any) => String(r)).includes(options.to);
      if (rejected) {
        throw new Error(`SMTP server rejected recipient: ${options.to}`);
      }

      await this.prisma.emailLog.create({
        data: {
          recipient: options.to,
          subject: options.subject,
          template: options.template || "GENERAL",
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });
      return true;
    } catch (err: any) {
      const safeErr = this.categorizeSmtpError(err);
      this.logger.error(`Failed to send email to ${options.to}: ${safeErr}`);

      await this.prisma.emailLog.create({
        data: {
          recipient: options.to,
          subject: options.subject,
          template: options.template || "GENERAL",
          status: EmailStatus.FAILED,
          errorMessage: safeErr,
        },
      });
      return false;
    }
  }

  /**
   * Safe SMTP connectivity and authentication verification (Section 6 & 7).
   * Verifies host reachable, port reachable, TLS connection succeeds, and authentication succeeds.
   * Safe for admin inspection — never reveals passwords or secrets.
   */
  async verifySmtpConnection(): Promise<{
    success: boolean;
    message: string;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    code?: string;
    error?: string;
  }> {
    const { host, port, secure, user, pass } = this.smtpConfig;

    if (!pass) {
      const errorMsg = "SMTP_PASSWORD is not configured";
      this.logger.error(errorMsg);
      return {
        success: false,
        message: errorMsg,
        host,
        port,
        secure,
        user,
        error: errorMsg,
      };
    }

    try {
      if (!this.transporter) {
        this.initializeTransporter();
      }

      if (!this.transporter) {
        throw new Error("SMTP transporter not initialized.");
      }

      await this.transporter.verify();

      return {
        success: true,
        message: "SMTP connection successful",
        host,
        port,
        secure,
        user,
      };
    } catch (error: any) {
      const isAuthError =
        error?.code === "EAUTH" ||
        error?.responseCode === 535 ||
        (error?.message || "").toLowerCase().includes("auth");

      const code = error?.code || (isAuthError ? "EAUTH" : "UNKNOWN");
      const safeError = error?.response || error?.message || (isAuthError
        ? "SMTP server rejected the supplied credentials."
        : this.categorizeSmtpError(error));

      return {
        success: false,
        message: isAuthError
          ? "SMTP authentication failed"
          : "SMTP connection failed",
        host,
        port,
        secure,
        user,
        code,
        error: safeError,
      };
    }
  }
}
