export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

function parsePassword(val?: string): string {
  if (!val) return "";
  let clean = val;
  // Read SMTP_PASSWORD. Only remove surrounding quotes if present.
  if (
    (clean.startsWith('"') && clean.endsWith('"') && clean.length >= 2) ||
    (clean.startsWith("'") && clean.endsWith("'") && clean.length >= 2)
  ) {
    clean = clean.slice(1, -1);
  }
  // Strip display spaces if an App Password formatted with spaces was provided
  return clean.replace(/\s+/g, "");
}

function cleanEnvString(val: string | undefined, defaultValue: string = ""): string {
  if (!val) return defaultValue;
  const stripped =
    (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
    (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
      ? val.slice(1, -1)
      : val;
  return stripped.trim() || defaultValue;
}

export function getSmtpConfig(): SmtpConfig {
  const host = cleanEnvString(process.env.SMTP_HOST, "smtp.gmail.com");
  const portStr = cleanEnvString(process.env.SMTP_PORT, "465");
  const port = parseInt(portStr, 10) || 465;
  const secureStr = cleanEnvString(process.env.SMTP_SECURE, "true");
  // Port 465 strictly requires implicit SSL/TLS SMTP connection (secure: true)
  const secure = secureStr === "true" || port === 465;
  const user = cleanEnvString(process.env.SMTP_USER);
  const pass = parsePassword(process.env.SMTP_PASSWORD);
  const fromEmail = cleanEnvString(
    process.env.SMTP_FROM_EMAIL || process.env.OTP_FROM_EMAIL || process.env.SMTP_USER,
    user,
  );
  const fromName = cleanEnvString(
    process.env.SMTP_FROM_NAME || process.env.OTP_FROM_NAME,
    "Marketing Executive Recruitment",
  );

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromEmail,
    fromName,
  };
}
