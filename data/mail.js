// Spheronix Technology — Email Notification Service
// Dispatches email alerts to spheronixtechnology@gmail.com
// whenever a new student application is submitted.
import nodemailer from 'nodemailer';

const RECIPIENT = process.env.NOTIFICATION_EMAIL || 'spheronixtechnology@gmail.com';
const SMTP_USER = process.env.SMTP_USER || 'spheronixtechnology@gmail.com';
const SMTP_PASS = (process.env.SMTP_PASS || '').trim();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_PASS) return null;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== '0',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  } else {
    // Default to Gmail service
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return transporter;
}

export function getMailStatus() {
  return {
    configured: Boolean(SMTP_PASS),
    recipient: RECIPIENT,
    user: SMTP_USER,
  };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Sends an email alert for a newly received application.
 * Non-blocking: logs on failure without halting the application flow.
 */
export async function sendApplicantAlert(data, id, content = {}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[Email Alert Skipped] SMTP_PASS not set in .env. Notification for ${data.name} (${data.email}) not sent.`);
    return { ok: false, skipped: true };
  }

  const prog = content.programs?.find((p) => p.id === data.program);
  const progTitle = prog ? prog.title : data.program;
  const now = new Date();
  const dateStr = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const port = process.env.PORT || 4300;
  const adminUrl = process.env.SITE_URL ? `${process.env.SITE_URL}/admin` : `http://localhost:${port}/admin`;

  const subject = `[New Application] ${prog?.short || progTitle} — ${data.name}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d11; color: #ffffff; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #15181e; border: 1px solid #23272f; border-radius: 4px; padding: 28px;">
    <div style="border-bottom: 1px solid #23272f; padding-bottom: 16px; margin-bottom: 20px;">
      <div style="font-size: 13px; font-weight: 700; color: #3d8bff; letter-spacing: 0.08em; text-transform: uppercase;">SPHERONIX TECHNOLOGY</div>
      <h1 style="font-size: 22px; font-weight: 600; margin: 8px 0 4px; color: #ffffff;">New Student Application</h1>
      <p style="margin: 0; font-size: 13px; color: #8a909a;">Received via website admissions portal</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 13px; color: #8a909a; width: 140px;">Applicant Name</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 14px; color: #ffffff; font-weight: 600;">${esc(data.name)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 13px; color: #8a909a;">Program</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 14px; color: #3d8bff; font-weight: 600;">${esc(progTitle)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 13px; color: #8a909a;">Email</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 14px; color: #ffffff;">
          <a href="mailto:${esc(data.email)}" style="color: #3d8bff; text-decoration: none;">${esc(data.email)}</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 13px; color: #8a909a;">Phone</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 14px; color: #ffffff;">
          <a href="tel:${esc(data.phone.replace(/\\s/g, ''))}" style="color: #3d8bff; text-decoration: none;">${esc(data.phone)}</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 13px; color: #8a909a;">Background</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 14px; color: #ffffff;">${esc(data.background || 'Not specified')}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 13px; color: #8a909a;">Source</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 14px; color: #ffffff;">${esc(data.source || 'Website Form')}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 13px; color: #8a909a;">Received At</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #23272f; font-size: 14px; color: #ffffff;">${esc(dateStr)}</td>
      </tr>
    </table>

    ${data.message ? `
    <div style="margin: 20px 0;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #8a909a; margin-bottom: 8px;">Message from Student:</div>
      <div style="background: #0b0d11; border: 1px solid #23272f; border-radius: 4px; padding: 14px; font-size: 14px; color: #d9dce1; line-height: 1.5; white-space: pre-wrap;">${esc(data.message)}</div>
    </div>` : ''}

    <div style="text-align: center; margin-top: 28px;">
      <a href="${adminUrl}" style="display: inline-block; background: #2271e3; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 2px;">View in Admin Dashboard &rarr;</a>
    </div>

    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #23272f; text-align: center; font-size: 12px; color: #5e646e;">
      Spheronix Technology Admissions Notification &bull; ID: ${esc(id || '')}
    </div>
  </div>
</body>
</html>`;

  const text = `SPHERONIX TECHNOLOGY — New Student Application

Applicant: ${data.name}
Program: ${progTitle}
Email: ${data.email}
Phone: ${data.phone}
Background: ${data.background || 'Not specified'}
Source: ${data.source || 'Website Form'}
Received: ${dateStr}

${data.message ? `Message:\n${data.message}\n` : ''}
Manage Application: ${adminUrl}
ID: ${id || ''}
`;

  try {
    const info = await mailer.sendMail({
      from: `"Spheronix Admissions" <${SMTP_USER}>`,
      to: RECIPIENT,
      replyTo: data.email,
      subject,
      text,
      html,
    });
    console.log(`[Email Alert Sent] Notification for ${data.name} delivered to ${RECIPIENT} (Message ID: ${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email Alert Error] Failed to send email to ${RECIPIENT}:`, err.message);
    return { ok: false, error: err.message };
  }
}

