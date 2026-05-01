import express from "express";
import mongoose from "mongoose";
import { Story } from "../models/Story";

const router = express.Router();
type StoryInput = {
  title?: string;
  description?: string;
  lng: number;
  lat: number;
};

const inMemoryStories: Array<StoryInput & { _id: string; createdAt: Date }> =
  [];

const isMongoConnected = () => mongoose.connection.readyState === 1;

const isValidStoryInput = (payload: unknown): payload is StoryInput => {
  if (!payload || typeof payload !== "object") return false;
  const story = payload as Partial<StoryInput>;
  return typeof story.lng === "number" && typeof story.lat === "number";
};

router.post("/", async (req, res) => {
  if (!isValidStoryInput(req.body)) {
    res.status(400).json({ message: "Invalid story payload" });
    return;
  }

  try {
    if (isMongoConnected()) {
      const story = await Story.create(req.body);
      res.status(201).json(story);
      return;
    }

    const localStory = {
      ...req.body,
      _id: `local-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      createdAt: new Date(),
    };
    inMemoryStories.unshift(localStory);
    res.status(201).json(localStory);
  } catch (error) {
    console.error("Failed to create story:", error);
    res.status(500).json({ message: "Failed to create story" });
  }
});

router.get("/", async (_, res) => {
  try {
    if (isMongoConnected()) {
      const stories = await Story.find().sort({ createdAt: -1 });
      res.json(stories);
      return;
    }

    res.json(inMemoryStories);
  } catch (error) {
    console.error("Failed to fetch stories:", error);
    res.status(500).json({ message: "Failed to fetch stories" });
  }
});

router.put("/:id", async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) return res.status(404).json({ error: "Not found" });
  if (story.userId !== req.body.userId) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const updated = await Story.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  return res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) return res.status(404).json({ error: "Not found" });
  if (story.userId !== req.body.userId) {
    return res.status(403).json({ error: "Not allowed" });
  }
  await Story.findByIdAndDelete(req.params.id);
  return res.json({ success: true });
});

export default router;
