"""
Email Service for AporTamos — sends transactional emails via Gmail SMTP.

Uses the Python standard library (smtplib + email.message), so no extra
dependency is added (Constitution Principle IV).

Configuration (set in .env):
  SMTP_USER      = your Gmail address
  SMTP_PASSWORD  = a Gmail "App Password" (16 chars, not your normal password)
  SMTP_HOST      = smtp.gmail.com  (default)
  SMTP_PORT      = 587             (default, STARTTLS)

If SMTP is not configured, send functions log a warning and return False
instead of raising — so an unconfigured environment never breaks invitations.
"""

import smtplib
from email.message import EmailMessage

from app.config import settings, log_info, log_warning, log_error


def is_email_configured() -> bool:
    """True if SMTP credentials are present."""
    return bool(settings.smtp_user and settings.smtp_password)


def _send_email(to_email: str, subject: str, text_body: str, html_body: str) -> bool:
    """Send a single email via Gmail SMTP. Returns True on success."""
    if not is_email_configured():
        log_warning(
            "Email not sent — SMTP not configured (set SMTP_USER and SMTP_PASSWORD)",
            extra={"to": to_email},
        )
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = to_email
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        log_info("Email sent", extra={"to": to_email, "subject": subject})
        return True
    except Exception as exc:
        log_error("Failed to send email", exc, extra={"to": to_email})
        return False


def send_invitation_email(
    to_email: str,
    household_name: str,
    inviter_name: str,
    join_link: str,
) -> bool:
    """Send a household invitation email with a join link."""
    subject = f"{inviter_name} te ha invitado a «{household_name}» en AporTamos"

    text_body = (
        f"¡Hola!\n\n"
        f"{inviter_name} te ha invitado a unirte al hogar «{household_name}» en AporTamos, "
        f"la app para organizar las tareas del hogar en familia.\n\n"
        f"Abre este enlace desde tu móvil para unirte:\n{join_link}\n\n"
        f"Si no esperabas esta invitación, puedes ignorar este correo.\n\n"
        f"— El equipo de AporTamos"
    )

    html_body = f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1b1b23">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:28px;font-weight:800;color:#4648d4">🏠 AporTamos</div>
  </div>
  <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">Te han invitado a un hogar</h2>
  <p style="font-size:15px;line-height:1.5;color:#464554">
    <strong>{inviter_name}</strong> te ha invitado a unirte al hogar
    <strong>«{household_name}»</strong> en AporTamos para organizar juntos las tareas de casa.
  </p>
  <div style="text-align:center;margin:28px 0">
    <a href="{join_link}"
       style="background:#4648d4;color:#fff;text-decoration:none;font-weight:700;
              padding:14px 28px;border-radius:9999px;display:inline-block;font-size:15px">
      Unirme al hogar
    </a>
  </div>
  <p style="font-size:13px;line-height:1.5;color:#767586">
    Si el botón no funciona, abre este enlace desde tu móvil:<br>
    <span style="color:#4648d4;word-break:break-all">{join_link}</span>
  </p>
  <p style="font-size:12px;color:#a0a0a0;margin-top:24px">
    Si no esperabas esta invitación, puedes ignorar este correo.
  </p>
</div>
"""

    return _send_email(to_email, subject, text_body, html_body)
