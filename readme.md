# 🌍 Travel Story Map

An interactive map where users can pin locations, attach stories, and turn memories into visual experiences.

---

## ✨ Overview

Travel Story Map is a full-stack web application that allows users to:

* 📍 Pin locations directly on a map or search for places
* 📝 Add personal stories to each location
* 📸 Upload images for visual storytelling
* ✏️ Edit and 🗑️ delete their own stories
* 🌍 Explore stories shared by others

The goal was to go beyond a basic CRUD app and build something that feels **interactive, spatial, and alive**.

---

## 🚀 Live Demo

👉 [Live App](https://travel-story-amber.vercel.app/)
👉 [Backend API](https://travel-story-api-ed6q.onrender.com)



---

## 🧠 Features

### 🗺️ Map Interaction

* Click anywhere on the map to create a story
* Search locations using Mapbox Geocoding
* Smooth fly-to animations between locations

### 📖 Story System

* Add title, description, and image
* Popup preview on map markers
* Sidebar list with quick navigation

### 👤 User Ownership (No Auth System)

* Each user gets a unique ID via localStorage
* Users can only edit/delete their own stories
* View all stories or filter “My Stories”

### 📸 Image Upload

* Images uploaded via Cloudinary
* Instant preview before saving
* Optimized external storage (not stored in DB)

### ⚡ UX Enhancements

* Loading states for async actions
* Toast notifications for feedback
* Empty states for better usability
* Smooth micro-interactions

---

## 🏗️ Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS
* Mapbox GL JS

### Backend

* Node.js
* Express

### Database

* MongoDB (Atlas)

### External Services

* Mapbox (Maps + Geocoding)
* Cloudinary (Image Hosting)

---

## 🧩 Architecture

```
Frontend (React)
        ↓
Backend (Express API)
        ↓
MongoDB (Atlas)
```

Image Upload Flow:

```
Frontend → Cloudinary → URL → Backend → Database
```

---

## ⚙️ Setup Instructions

### 1. Clone the repo

```
git clone https://github.com/your-username/travel-story-map.git
cd travel-story-map
```

---

### 2. Setup Backend

```
cd backend
npm install
```

Create `.env` file:

```
MONGO_URI=your_mongodb_atlas_url
PORT=5000
```

Run server:

```
npm run dev
```

---

### 3. Setup Frontend

```
cd frontend
npm install
```

Create `.env` file:

```
VITE_API_URL=http://localhost:5000
VITE_MAPBOX_TOKEN=your_mapbox_token
```

Run app:

```
npm run dev
```

---

## 🌐 Deployment

* Frontend: Vercel
* Backend: Render
* Database: MongoDB Atlas

---

## ⚠️ Notes

* This project uses a lightweight ownership model (no authentication system)
* Users are identified via `localStorage` (not secure, but suitable for demo purposes)

---

## 🎯 Future Improvements

* 🔐 Full authentication (JWT)
* 📷 Multiple image uploads per story
* 🔍 Advanced search & filters
* 📱 Improved mobile experience
* 🤖 AI-generated story enhancement

---

## 📬 Feedback

Open to feedback, suggestions, or ideas for improvement!

---

## ⭐ If you liked this project

Give it a star ⭐ — it helps a lot!
