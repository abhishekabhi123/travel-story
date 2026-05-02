import express from "express";
import mongoose from "mongoose";
import { Story } from "../models/Story";

const router = express.Router();

type StoredStory = {
  _id: string;
  createdAt: Date;
  title?: string;
  description?: string;
  lng: number;
  lat: number;
  userId?: string;
  imageUrl?: string;
};

const inMemoryStories: StoredStory[] = [];

const isMongoConnected = () => mongoose.connection.readyState === 1;

const parseFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

const normalizeStoryBody = (
  body: Record<string, unknown>,
): Omit<StoredStory, "_id" | "createdAt"> | null => {
  const lng = parseFiniteNumber(body.lng);
  const lat = parseFiniteNumber(body.lat);
  if (lng === undefined || lat === undefined) return null;

  const title = typeof body.title === "string" ? body.title : undefined;
  const description =
    typeof body.description === "string" ? body.description : undefined;
  const userId = typeof body.userId === "string" ? body.userId : undefined;
  const imageUrl =
    typeof body.imageUrl === "string" ? body.imageUrl : undefined;

  return { lng, lat, title, description, userId, imageUrl };
};

router.post("/", async (req, res) => {
  const normalized = normalizeStoryBody(req.body as Record<string, unknown>);
  if (!normalized) {
    res.status(400).json({ message: "Invalid story payload" });
    return;
  }

  try {
    if (isMongoConnected()) {
      const story = await Story.create(normalized);
      res.status(201).json(story);
      return;
    }

    const localStory: StoredStory = {
      ...normalized,
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
  try {
    if (!isMongoConnected()) {
      const idx = inMemoryStories.findIndex((s) => s._id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const existing = inMemoryStories[idx];
      if (existing.userId !== req.body.userId) {
        res.status(403).json({ error: "Not allowed" });
        return;
      }
      const patch = normalizeStoryBody(req.body as Record<string, unknown>);
      if (!patch) {
        res.status(400).json({ message: "Invalid story payload" });
        return;
      }
      const updated: StoredStory = {
        ...existing,
        ...patch,
        _id: existing._id,
        createdAt: existing.createdAt,
      };
      inMemoryStories[idx] = updated;
      res.json(updated);
      return;
    }

    const story = await Story.findById(req.params.id);
    if (!story) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (story.userId !== req.body.userId) {
      res.status(403).json({ error: "Not allowed" });
      return;
    }
    const updated = await Story.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (error) {
    console.error("Failed to update story:", error);
    res.status(500).json({ message: "Failed to update story" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!isMongoConnected()) {
      const idx = inMemoryStories.findIndex((s) => s._id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const existing = inMemoryStories[idx];
      if (existing.userId !== req.body.userId) {
        res.status(403).json({ error: "Not allowed" });
        return;
      }
      inMemoryStories.splice(idx, 1);
      res.json({ success: true });
      return;
    }

    const story = await Story.findById(req.params.id);
    if (!story) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (story.userId !== req.body.userId) {
      res.status(403).json({ error: "Not allowed" });
      return;
    }
    await Story.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete story:", error);
    res.status(500).json({ message: "Failed to delete story" });
  }
});

export default router;
