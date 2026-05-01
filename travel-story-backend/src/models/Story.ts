import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
  title: String,
  description: String,
  lng: Number,
  lat: Number,
  imageUrl: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  userId: String,
});

export const Story = mongoose.model("Story", storySchema);
