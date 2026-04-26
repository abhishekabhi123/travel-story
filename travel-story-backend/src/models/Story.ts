import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
    title: String,
    description: String,
    lng: Number,
    lat: Number,
    createdAt: {
        type: Date,
        default: Date.now,
    },
})

export const Story = mongoose.model("Story", storySchema)