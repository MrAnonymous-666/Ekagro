const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOTPEmail(toEmail, otp, purpose) {
  const subject = purpose === "delete" ? "Confirm Account Deletion - OTP"
    : purpose === "login2fa" ? "Your Login Verification Code"
    : "Your Password Reset OTP";

  const heading = purpose === "delete" ? "Account Deletion Request"
    : purpose === "login2fa" ? "Verify It's You"
    : "Password Reset Request";

  const bodyText = purpose === "delete"
    ? "Use the OTP below to confirm you want to delete your account. Your account will enter a 7-day recovery window - logging back in during that time restores it automatically."
    : purpose === "login2fa"
    ? "Two-factor authentication is enabled on your account. Enter the code below to finish logging in. It is valid for 10 minutes."
    : "Use the OTP below to reset your password. It is valid for 10 minutes.";

  await transporter.sendMail({
    from: `"Ekagro" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:400px;margin:auto;">
        <h2>${heading}</h2>
        <p>${bodyText}</p>
        <h1 style="letter-spacing:5px;">${otp}</h1>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  });
}

module.exports = { sendOTPEmail };
