import smtplib
from email.message import EmailMessage
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_otp_email(to_email: str, otp_code: str) -> dict:
    """
    Sends a 6-digit OTP verification code email to the recipient.
    """
    subject = f"{otp_code} is your ShareSplit Verification Code"
    
    plain_content = f"""Hello,

You requested a password reset for your ShareSplit account ({to_email}).

Your 6-digit verification code is:
  {otp_code}

This code is valid for 10 minutes. Enter it on the ShareSplit password recovery screen to set your new password.

If you did not make this request, please ignore this email.

Best regards,
The ShareSplit Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ShareSplit Password Reset Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
    <div style="background-color: #059669; padding: 24px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">ShareSplit</h1>
      <p style="color: #a7f3d0; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Password Recovery Code</p>
    </div>
    
    <div style="padding: 32px 24px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 0 0 16px 0;">
        Hello,
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">
        We received a request to reset the password for your ShareSplit account (<strong>{to_email}</strong>). Enter the 6-digit verification code below on the recovery screen:
      </p>
      
      <div style="background-color: #f0fdf4; border: 2px dashed #10b981; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #065f46; margin-bottom: 8px;">
          Your 6-Digit Verification Code
        </span>
        <div style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #047857;">
          {otp_code}
        </div>
        <span style="display: block; font-size: 12px; color: #64748b; margin-top: 8px;">
          ⏱ Valid for 10 minutes
        </span>
      </div>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.4; margin: 0 0 20px 0;">
        If you did not request this verification code, you can safely ignore this email. Your password will remain unchanged.
      </p>
      
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
      
      <p style="color: #94a3b8; font-size: 11px; line-height: 1.4; margin: 0; text-align: center;">
        This email was sent by ShareSplit. Please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>
"""

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"[ShareSplit SMTP] Cannot send real email to {to_email}: SMTP_USER or SMTP_PASSWORD is not configured in backend/.env")
        return {
            "sent": False,
            "dev_mode": True,
            "message": "SMTP credentials not configured in backend/.env. Please configure SMTP_USER and SMTP_PASSWORD to send real emails."
        }

    try:
        clean_user = settings.SMTP_USER.strip()
        clean_password = settings.SMTP_PASSWORD.replace(" ", "").strip()
        clean_from_name = settings.SMTP_FROM_NAME.strip() or "ShareSplit"

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{clean_from_name} <{clean_user}>"
        msg["To"] = to_email
        msg.set_content(plain_content)
        msg.add_alternative(html_content, subtype="html")

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12) as server:
            server.starttls()
            server.login(clean_user, clean_password)
            server.send_message(msg)

        logger.info(f"Successfully sent password reset OTP email to {to_email}")
        return {
            "sent": True,
            "dev_mode": False,
            "message": "Verification code sent to your email address."
        }
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return {
            "sent": False,
            "dev_mode": False,
            "error": str(e),
            "message": f"SMTP delivery failed: {str(e)}"
        }
