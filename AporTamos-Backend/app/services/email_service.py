"""
Email Service for AporTamos — sends transactional emails via the Brevo HTTP API.

We use Brevo's REST API over HTTPS (not SMTP) because hosting platforms like
Render block outbound SMTP ports (25/465/587). httpx is already a dependency,
so no new package is added (Constitution Principle IV).

Configuration (set in .env / Render env):
  BREVO_API_KEY       = your Brevo API key (starts with "xkeysib-")
  BREVO_SENDER_EMAIL  = a sender email VERIFIED in your Brevo account
  SMTP_FROM_NAME      = display name shown as the sender (default "AporTamos")

If Brevo is not configured, send functions log a warning and return False
instead of raising — so an unconfigured environment never breaks invitations.
"""

import httpx

from app.config import settings, log_info, log_warning, log_error

# Brevo transactional email endpoint
BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


def is_email_configured() -> bool:
    """True if Brevo API key and a verified sender are present."""
    return bool(settings.brevo_api_key and settings.brevo_sender_email)


def _send_email(to_email: str, subject: str, text_body: str, html_body: str) -> bool:
    """Send a single email via the Brevo HTTP API. Returns True on success."""
    if not is_email_configured():
        log_warning(
            "Email not sent — Brevo not configured (set BREVO_API_KEY and BREVO_SENDER_EMAIL)",
            extra={"to": to_email},
        )
        return False

    payload = {
        "sender": {"name": settings.smtp_from_name, "email": settings.brevo_sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": text_body,
        "htmlContent": html_body,
    }
    headers = {
        "api-key": settings.brevo_api_key,
        "content-type": "application/json",
        "accept": "application/json",
    }

    try:
        response = httpx.post(BREVO_SEND_URL, json=payload, headers=headers, timeout=15)
        if response.status_code in (200, 201):
            log_info("Email sent", extra={"to": to_email, "subject": subject})
            return True
        log_error(
            f"Failed to send email — Brevo API error: status={response.status_code} "
            f"body={response.text[:500]}",
            extra={"to": to_email},
        )
        return False
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
