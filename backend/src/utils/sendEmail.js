import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // Create a test transporter for development
  // In production, you would use a real email service
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_EMAIL || 'ethereal.user@ethereal.email',
      pass: process.env.SMTP_PASSWORD || 'ethereal_password'
    }
  });

  const message = {
    from: `${process.env.FROM_NAME || 'WorkerMatch'} <${process.env.FROM_EMAIL || 'noreply@workermatch.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
};

export default sendEmail;
