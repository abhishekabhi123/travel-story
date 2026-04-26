import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import storyRoutes from "./routes/storyRoutes";
import "dotenv/config";

const app = express();

app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI ?? "";
if (!mongoUri) {
  throw new Error("MONGODB_URI is not set");
}

mongoose
  .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch(() => {
    console.error(
      "MongoDB unavailable. Running with in-memory story fallback.",
    );
  });

app.get("/", (_, res) => {
  res.send("API running");
});

app.use("/stories", storyRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
