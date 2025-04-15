import nodemailer from "nodemailer";
import dotenv from 'dotenv';
dotenv.config();


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_EMAIL_PASS,
  },
});

const sendMail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is: ${otp}`,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send OTP email");
  }
};

export { sendMail };
