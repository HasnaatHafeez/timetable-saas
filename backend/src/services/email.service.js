const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

function getFromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@timetrix.local";
}

async function sendPasswordResetEmail({ to, resetLink, expiresInMinutes = 60 }) {
  const client = getTransporter();

  const subject = "Reset your Timetrix password";
  const text = [
    "We received a request to reset your password.",
    "",
    `Reset your password: ${resetLink}`,
    "",
    `This link expires in ${expiresInMinutes} minutes.`,
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>We received a request to reset your password.</p>
    <p><a href="${resetLink}">Reset your password</a></p>
    <p>This link expires in ${expiresInMinutes} minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  if (!client) {
    console.warn("[auth] SMTP is not configured. Password reset email not sent.");
    console.info(`[auth] Password reset link for ${to}: ${resetLink}`);
    return;
  }

  await client.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendPasswordResetEmail,
};
