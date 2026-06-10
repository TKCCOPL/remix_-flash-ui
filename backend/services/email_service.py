import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def _get_config():
    """Read config at runtime (after .env.local is loaded)."""
    return {
        "host": os.environ.get("SMTP_HOST", "localhost"),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASSWORD") or os.environ.get("SMTP_PASS", ""),
        "from": os.environ.get("SMTP_FROM", "noreply@blog.xiaocc.dev"),
        "use_ssl": os.environ.get("SMTP_USE_SSL", "false").lower() == "true",
        "enabled": os.environ.get("EMAIL_ENABLED", "false").lower() == "true",
    }


REPLY_EMAIL_TEMPLATE = """
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #333;">有人回复了你的评论</h2>
  <p style="color: #555; line-height: 1.6;">
    <strong>{replier_name}</strong> 在文章 <strong>{post_title}</strong> 中回复了你的评论。
  </p>
  <a href="{post_url}"
     style="display: inline-block; padding: 10px 20px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; margin-top: 12px;">
    查看回复
  </a>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="color: #999; font-size: 12px;">
    此邮件由 XiaoC Blog 自动发送，请勿直接回复。
  </p>
</div>
"""


def send_email(to: str, subject: str, html_body: str) -> bool:
    config = _get_config()

    if not config["enabled"]:
        logger.debug("Email disabled, skipping send to %s", to)
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = config["from"]
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if config["use_ssl"] or config["port"] == 465:
            # SSL connection (port 465)
            with smtplib.SMTP_SSL(config["host"], config["port"]) as server:
                if config["user"] and config["password"]:
                    server.login(config["user"], config["password"])
                server.sendmail(config["from"], [to], msg.as_string())
        else:
            # STARTTLS connection (port 587 or 25)
            with smtplib.SMTP(config["host"], config["port"]) as server:
                server.ehlo()
                if config["port"] != 25:
                    server.starttls()
                    server.ehlo()
                if config["user"] and config["password"]:
                    server.login(config["user"], config["password"])
                server.sendmail(config["from"], [to], msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False


def send_reply_notification_email(
    recipient_email: str,
    replier_name: str,
    post_title: str,
    post_url: str,
) -> bool:
    subject = f"有人回复了你的评论 - {post_title}"
    html_body = REPLY_EMAIL_TEMPLATE.format(
        replier_name=replier_name,
        post_title=post_title,
        post_url=post_url,
    )
    return send_email(recipient_email, subject, html_body)
