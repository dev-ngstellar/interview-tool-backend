export interface OtpEmailParams {
  candidateName: string;
  otp: string;
  expiryMinutes: number;
}

export function renderOtpEmail(params: OtpEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Your Marketing Executive Recruitment Verification Code";

  const text = `Hello ${params.candidateName},

Your verification code for the Marketing Executive
Recruitment Assessment is:

${params.otp}

This code will expire in ${params.expiryMinutes} minutes.

Please do not share this code with anyone.

If you did not request this verification code, you can ignore
this email.

Regards,
Marketing Executive Recruitment Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f9fafb; margin: 0; padding: 24px; }
    .card { background-color: #111827; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.37); }
    .header { font-size: 14px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    h1 { font-size: 22px; margin: 0 0 16px; color: #f9fafb; }
    p { font-size: 15px; line-height: 1.6; color: #9ca3af; margin: 0 0 20px; }
    .otp-box { background: rgba(99, 102, 241, 0.1); border: 2px dashed #6366f1; border-radius: 8px; padding: 18px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #f9fafb; margin: 24px 0; font-family: monospace; }
    .footer { font-size: 13px; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">Marketing Executive College Drive</div>
    <h1>Recruitment Verification Code</h1>
    <p>Hello <strong>${params.candidateName}</strong>,</p>
    <p>Your verification code for the Marketing Executive Recruitment Assessment is:</p>
    <div class="otp-box">${params.otp}</div>
    <p>This code will expire in <strong>${params.expiryMinutes} minutes</strong>.</p>
    <p>Please do not share this code with anyone. If you did not request this verification code, you can ignore this email.</p>
    <div class="footer">
      Regards,<br>
      <strong>Marketing Executive Recruitment Team</strong>
    </div>
  </div>
</body>
</html>
`;

  return { subject, text, html };
}
