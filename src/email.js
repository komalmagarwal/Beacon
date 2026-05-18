import nodemailer from 'nodemailer';

export async function sendEmail(htmlContent, subject = 'Your Beacon digest this week') {
  console.log('📧 Sending email...');

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ionos.co.uk',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  await transporter.sendMail({
    from: `Beacon <${process.env.EMAIL_FROM}>`,
    to: process.env.EMAIL_TO,
    subject,
    html: htmlContent
  });

  console.log(`  ✓ Email sent to ${process.env.EMAIL_TO}`);
}