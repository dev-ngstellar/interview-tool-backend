export interface AppConfig {
  port: number;
  environment: string;
  apiPrefix: string;
  corsOrigin: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiration: string;
  storage: {
    provider: string;
    bucket: string;
    region: string;
    accessKey: string;
    secretKey: string;
    endpoint?: string;
    maxResumeSizeMb: number;
  };
  email: {
    provider: string;
    from: string;
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromEmail: string;
    fromName: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.API_PORT || "4000", 10),
  environment: process.env.NODE_ENV || "development",
  apiPrefix: process.env.API_PREFIX || "api",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/recruitment_app?schema=public",
  jwtSecret:
    process.env.JWT_SECRET || "dev-jwt-secret-replace-in-production-use",
  jwtExpiration: process.env.JWT_EXPIRATION || "24h",
  storage: {
    provider: process.env.STORAGE_PROVIDER || "local",
    bucket: process.env.STORAGE_BUCKET || "recruitment-resumes",
    region: process.env.STORAGE_REGION || "us-east-1",
    accessKey: process.env.STORAGE_ACCESS_KEY || "",
    secretKey: process.env.STORAGE_SECRET_KEY || "",
    endpoint: process.env.STORAGE_ENDPOINT,
    maxResumeSizeMb: parseInt(process.env.MAX_RESUME_SIZE_MB || "5", 10),
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || "smtp",
    from: process.env.SMTP_FROM_EMAIL || process.env.OTP_FROM_EMAIL || process.env.SMTP_USER || "",
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
    secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASSWORD || "",
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.OTP_FROM_EMAIL || process.env.SMTP_USER || "",
    fromName: process.env.SMTP_FROM_NAME || process.env.OTP_FROM_NAME || "Marketing Executive Recruitment",
  },
});
