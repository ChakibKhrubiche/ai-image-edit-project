import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true pour 465, false pour 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  await transporter.sendMail({
    from: `"HijabTryOn" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html: html ?? `<p>${text}</p>`,
  });
}