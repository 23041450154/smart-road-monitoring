import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_verification_email(
    to_email: str,
    code: str,
    user_name: str | None = None,
) -> bool:
    """Sends an email verification code (OTP) to the user's Gmail address via SMTP."""
    settings = get_settings()

    if not settings.smtp_user or not settings.smtp_password:
        logger.info(
            "[DEV / DEMO] SMTP belum dikonfigurasi. Kode verifikasi untuk %s: %s",
            to_email,
            code,
        )
        return False

    display_name = user_name.strip() if user_name else "Pengguna LAJU"
    subject = f"{code} adalah kode verifikasi akun Smart Road Anda"

    text_content = f"""Halo {display_name},

Terima kasih telah mendaftar di Smart Road Monitoring Palembang (LAJU).

Kode verifikasi pendaftaran akun Anda adalah:
{code}

Kode ini hanya berlaku selama {settings.email_verification_expire_minutes} menit.
Jangan berikan kode ini kepada siapa pun demi keamanan akun Anda.

Salam hangat,
Tim Smart Road Palembang (LAJU)
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kode Verifikasi LAJU</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
                LAJU &bull; Smart Road Palembang
              </h1>
              <p style="margin: 4px 0 0; color: #bfdbfe; font-size: 13px;">
                Verifikasi Email Pendaftaran Akun
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
                Halo <strong>{display_name}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                Terima kasih telah bergabung di sistem pemantauan lalu lintas dan kondisi jalan Kota Palembang. Masukkan kode verifikasi 6 digit berikut pada halaman pendaftaran:
              </p>

              <!-- Verification Code Badge -->
              <div style="background-color: #eff6ff; border: 1.5px dashed #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8;">
                  {code}
                </span>
                <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">
                  Berlaku selama {settings.email_verification_expire_minutes} menit
                </p>
              </div>

              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 14px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; color: #991b1b; line-height: 1.5;">
                  <strong>Peringatan Keamanan:</strong> Jangan pernah membagikan kode OTP ini kepada orang lain termasuk pihak yang mengaku dari Smart Road.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                Jika Anda tidak merasa melakukan pendaftaran ini, abaikan email ini dengan aman.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; 2026 Smart Road Monitoring Palembang (LAJU). All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    try:
        sender_email = settings.sender_email
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.smtp_from_name} <{sender_email}>"
        msg["To"] = to_email

        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if settings.smtp_port == 465:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=12) as server:
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(sender_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=12) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(sender_email, [to_email], msg.as_string())

        logger.info("Berhasil mengirim email verifikasi ke: %s", to_email)
        return True
    except Exception as exc:
        logger.error("Gagal mengirim email verifikasi via SMTP: %s", exc)
        return False
