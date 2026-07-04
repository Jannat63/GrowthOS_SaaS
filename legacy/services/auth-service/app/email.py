"""
Email sending via SendGrid.

SETUP REQUIRED before real emails send:
1. Create a SendGrid account, verify a sender identity/domain.
2. Generate an API key (Settings → API Keys).
3. Set env var on auth-service: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL

Until SENDGRID_API_KEY is set, send_email() logs the email content instead of
sending it and returns False — so signup and other flows that trigger an
email keep working without a configured email provider, they just don't
actually deliver anything yet.
"""
import os
import logging

logger = logging.getLogger("email")

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@growthos.app")


def send_email(to: str, subject: str, html_body: str) -> bool:
    if not SENDGRID_API_KEY:
        logger.warning(
            "SENDGRID_API_KEY not set — email not sent. Would have sent to=%s subject=%r",
            to, subject,
        )
        return False

    try:
        # Import here, not at module load, so the package is only required
        # once someone actually configures SendGrid.
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=SENDGRID_FROM_EMAIL,
            to_emails=to,
            subject=subject,
            html_content=html_body,
        )
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        return response.status_code in (200, 201, 202)
    except Exception:
        logger.exception("Failed to send email via SendGrid")
        return False


def send_verification_email(to: str, verification_url: str) -> bool:
    return send_email(
        to=to,
        subject="Verify your GrowthOS account",
        html_body=f"""
            <p>Welcome to GrowthOS.</p>
            <p><a href="{verification_url}">Click here to verify your email address</a></p>
            <p>This link expires in 24 hours.</p>
        """,
    )
