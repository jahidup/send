import mongoose from "mongoose";
import { Resend } from "resend";

// ===== ENV =====
const MONGO_URI = process.env.MONGO_URI;
const resend = new Resend(process.env.RESEND_API_KEY);

// ===== DB CONNECT =====
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(MONGO_URI);
  isConnected = true;
}

// ===== MODEL =====
const SubscriberSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true }
});

const Subscriber =
  mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);

// ===== HANDLER =====
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    await connectDB();

    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Save user
    await Subscriber.create({ name, email });

    // Send Email
    await resend.emails.send({
      from: "onboarding@resend.dev", // change after domain verify
      to: email,
      subject: "Subscription Confirmed 🎉",
      html: `
        <h2>Hello ${name}</h2>
        <p>Thanks for subscribing 🚀</p>
        <p>You will receive updates soon.</p>
      `
    });

    return res.status(200).json({
      message: "Subscribed Successfully ✅"
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Already subscribed ⚠️"
      });
    }

    console.error(err);
    return res.status(500).json({
      message: "Server Error ❌"
    });
  }
}
