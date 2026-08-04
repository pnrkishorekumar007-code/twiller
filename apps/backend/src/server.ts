import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";
import { config } from "@config";

const PORT = config.PORT;

async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URL);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", (error as Error).message);
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   Environment: ${config.NODE_ENV}`);
    console.log(`   CORS origin: ${config.FRONTEND_ORIGIN}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await mongoose.connection.close();
  process.exit(0);
});