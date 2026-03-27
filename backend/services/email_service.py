"""Gmail SMTP email service for contact form notifications."""

import os
import smtplib
from datetime import datetime, timezone
from email.mime.text import MIMEText

from glogger import logger


def send_contact_notification(name: str, email: str, message: str) -> None:
    """Send a contact form notification email via Gmail SMTP.

    If SMTP env vars are not configured, logs info and returns silently.
    On any SMTP error, logs the error but does not raise.
    """
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_APP_PASSWORD")
    notify_email = os.environ.get("CONTACT_NOTIFY_EMAIL")

    if not smtp_user or not smtp_password or not notify_email:
        logger.info("SMTP not configured, skipping contact notification email")
        return

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    body = f"Name: {name}\n" f"Email: {email}\n" f"Time: {timestamp}\n\n" f"Message:\n{message}"

    msg = MIMEText(body)
    msg["Subject"] = f"Contact form: {name}"
    msg["From"] = smtp_user
    msg["To"] = notify_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, notify_email, msg.as_string())
        logger.info(f"Contact notification sent for {name} <{email}>")
    except Exception as e:
        logger.error(f"Failed to send contact notification email: {e}")
