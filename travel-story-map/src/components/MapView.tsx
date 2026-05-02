import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import toast from "react-hot-toast";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export default function MapView() {
  const userId = localStorage.getItem("userId") || crypto.randomUUID();
  localStorage.setItem("userId", userId);
  type StoryLocation = {
    lng: number;
    lat: number;
    title?: string;
    description?: string;
  };
  type DraftStoryLocation = StoryLocation & { imageFile?: File };
  type Story = StoryLocation & {
    _id?: string;
    imageUrl?: string;
    userId?: string;
  };
  type MarkerEntry = {
    marker: mapboxgl.Marker;
    popup: mapboxgl.Popup;
    story: Story;
  };
  type MapboxPlace = {
    id: string;
    place_name: string;
    center: [number, number];
  };
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const suppressMapClickRef = useRef(false);
  const [selectedLocation, setSelectedLocation] =
    useState<DraftStoryLocation | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "mine">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<MapboxPlace[]>([]);

  const filteredStories =
    viewMode === "mine" ? stories.filter((s) => s.userId === userId) : stories;

  const imagePreviewUrl = useMemo(() => {
    const file = selectedLocation?.imageFile;
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [selectedLocation?.imageFile]);
  const closeAddStoryModal = () => {
    suppressMapClickRef.current = true;
    setSelectedLocation(null);
    setSaveError(null);
    setTimeout(() => {
      suppressMapClickRef.current = false;
    }, 180);
  };
  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  useEffect(() => {
    fetch(`${API_BASE_URL}/stories`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stories");
        return res.json();
      })
      .then((data) => setStories(data))
      .catch((err) => {
        console.error(err);
        setSaveError("Could not load stories from backend.");
      });
  }, []);

  useEffect(() => {
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [75.7804, 11.2588], // Calicut 👀
      zoom: 12,
    });

    map.on("click", (e) => {
      if (suppressMapClickRef.current) {
        return;
      }
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest(".mapboxgl-marker")) return;
      if (target.closest(".mapboxgl-popup")) return;
      if (target.closest(".mapboxgl-ctrl")) return;
      const { lng, lat } = e.lngLat;
      setSaveError(null);
      setSelectedLocation({ lng, lat });
    });
    map.on("load", () => setIsMapReady(true));
    map.on("error", (event) => {
      console.error("Mapbox error:", event.error);
      setMapError("Map failed to load. Check your Mapbox token.");
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;
    markersRef.current.forEach(({ marker, popup }) => {
      popup.remove();
      marker.remove();
    });
    markersRef.current = [];
    stories.forEach((story) => {
      const lng = Number(story.lng);
      const lat = Number(story.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      const safeTitle = escapeHtml(story.title || "Untitled");
      const safeDescription = escapeHtml(story.description || "No description");
      const safeImageUrl = escapeHtml(story.imageUrl || "");

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
  <div style="font-family: sans-serif; max-width: 200px;">
  ${
    safeImageUrl
      ? `<img src="${safeImageUrl}" style="width:100%; border-radius:8px; margin-bottom:6px;" />`
      : ""
  }
    <h3 style="font-weight: 600; margin-bottom: 4px;">
      ${safeTitle}
    </h3>
    <p style="font-size: 13px; color: #555;">
      ${safeDescription}
    </p>

   
    
  </div>
`);
      const marker = new mapboxgl.Marker({ color: "#3b82f6", scale: 1.1 })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push({ marker, popup, story });
    });
  }, [stories, isMapReady]);

  useEffect(() => {
    if (!activeStory || !mapRef.current) return;

    const match = markersRef.current.find((m) => {
      if (activeStory._id && m.story._id)
        return m.story._id === activeStory._id;
      return (
        m.story.lng === activeStory.lng &&
        m.story.lat === activeStory.lat &&
        m.story.title === activeStory.title &&
        m.story.description === activeStory.description
      );
    });
    if (!match) return;

    mapRef.current.flyTo({
      center: [match.story.lng, match.story.lat],
      zoom: 13,
      essential: true,
    });

    markersRef.current.forEach((m) => m.popup.remove());

    // open selected popup
    match.popup.addTo(mapRef.current);
  }, [activeStory]);

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (viewMode !== "mine") return;
    const mine = stories.filter((s) => s.userId === userId);
    if (mine.length === 0) return;
    const first = mine[0];
    mapRef.current?.flyTo({
      center: [first.lng, first.lat],
      zoom: 12,
    });
  }, [viewMode, stories, userId]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      return;
    }
    let isCancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const encoded = encodeURIComponent(query);
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`,
        );
        if (!res.ok) {
          if (!isCancelled) setResults([]);
          return;
        }
        const data: { features?: MapboxPlace[] } = await res.json();
        if (!isCancelled) {
          setResults(data.features || []);
        }
      } catch {
        if (!isCancelled) setResults([]);
      }
    }, 400);
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/stories/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        toast.error("Could not delete story.");
        return;
      }
      setStories((prev) => prev.filter((s) => s._id !== id));
      setDeletingId(null);
      toast.success("Story deleted 🗑️");
    } catch (error) {
      console.error(error);
      toast.error("Could not delete story.");
    }
  };

  return (
    <div className="flex w-full h-screen">
      <div className="absolute top-4 right-4 z-40 w-72">
        <input
          type="text"
          placeholder="Search location..."
          className="w-full px-3 py-2 rounded-lg bg-zinc-900 text-white border border-zinc-700 focus:outline-none"
          value={searchQuery}
          onChange={(e) => {
            const value = e.target.value;
            setSearchQuery(value);
            if (!value.trim()) {
              setResults([]);
            }
          }}
        />
        {results.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg mt-1 max-h-60 overflow-y-auto text-white">
            {results.map((place) => (
              <div
                key={place.id}
                className="px-3 py-2 text-sm hover:bg-zinc-800 cursor-pointer"
                onClick={() => {
                  const [lng, lat] = place.center ?? [];
                  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

                  mapRef.current?.flyTo({
                    center: [lng, lat],
                    zoom: 13,
                  });

                  setSelectedLocation({ lng, lat });
                  setSearchQuery("");
                  setResults([]);
                }}
              >
                {place.place_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* sidebar */}
      <div className="w-80 bg-zinc-900 text-white border-r border-zinc-800 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgb(82_82_91)_rgb(24_24_27)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-zinc-900 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-zinc-900 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-500">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex gap-2 bg-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("all")}
              className={`flex-1 py-1.5 text-sm rounded-md transition ${
                viewMode === "all"
                  ? "bg-blue-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              🌍 All
            </button>

            <button
              onClick={() => setViewMode("mine")}
              className={`flex-1 py-1.5 text-sm rounded-md transition ${
                viewMode === "mine"
                  ? "bg-blue-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              👤 Mine
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <h2 className="text-lg font-semibold mb-2">Stories</h2>
          {filteredStories.length === 0 && (
            <p className="text-sm text-zinc-500 px-4">No stories here yet.</p>
          )}
          {filteredStories.map((story, index) => (
            <div
              key={story._id ?? `story-${index}`}
              onClick={() => {
                setActiveStory(story);
              }}
              className={`group p-3 rounded-lg cursor-pointer transition-all border 
                ${
                  activeStory === story
                    ? "bg-blue-500/20 border-blue-500"
                    : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:scale-[1.02]"
                }`}
            >
              <h3 className="font-medium">{story.title || "Untitled"}</h3>
              <p className="text-sm text-zinc-400 line-clamp-2">
                {story.description || "No description"}
              </p>
              {story.imageUrl && (
                <img
                  src={story.imageUrl}
                  className="w-full h-24 object-cover rounded mb-2"
                />
              )}
              {story.userId === userId && (
                <div className="flex justify-between items-center mt-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    className="text-xs text-blue-400 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingStory(story);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="text-xs text-red-400 hover:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (story._id) setDeletingId(story._id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {deletingId && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-zinc-900 p-4 rounded-xl text-white">
            <p className="mb-4">Delete this story?</p>
            <div className="flex gap-2">
              <button
                className="bg-red-500 px-3 py-1 rounded"
                onClick={() => handleDelete(deletingId)}
              >
                Delete
              </button>
              <button
                className="bg-zinc-700 px-3 py-1 rounded"
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingStory && (
        <div
          className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center"
          onClick={() => setEditingStory(null)}
        >
          <div
            className="bg-zinc-900 text-white p-6 rounded-xl w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-semibold">Edit Story</h2>
            <input
              className="w-full mb-2 p-2 bg-zinc-800 rounded"
              value={editingStory.title || ""}
              onChange={(e) => {
                setEditingStory({ ...editingStory, title: e.target.value });
              }}
            />
            <textarea
              className="w-full mb-4 p-2 bg-zinc-800 rounded"
              value={editingStory.description || ""}
              onChange={(e) =>
                setEditingStory({
                  ...editingStory,
                  description: e.target.value,
                })
              }
            />

            <button
              className="w-full bg-blue-500 py-2 rounded"
              onClick={async () => {
                try {
                  const res = await fetch(
                    `${API_BASE_URL}/stories/${editingStory._id}`,
                    {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ ...editingStory, userId }),
                    },
                  );
                  if (!res.ok) {
                    toast.error("Could not update story.");
                    return;
                  }
                  const updatedStory = await res.json();
                  setStories((prev) =>
                    prev.map((s) =>
                      s._id === editingStory._id ? updatedStory : s,
                    ),
                  );
                  setEditingStory(null);
                  toast.success("Story updated ✏️");
                } catch (err) {
                  console.error(err);
                  toast.error("Could not update story.");
                }
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-40 bg-zinc-900/80 backdrop-blur-md text-white px-4 py-2 rounded-xl border border-zinc-700 shadow-lg">
          <p className="text-sm font-medium">Travel Story Map</p>
          <p className="text-xs text-zinc-400">{stories.length} stories</p>
        </div>
        {selectedLocation && (
          <div
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
            onClick={closeAddStoryModal}
          >
            <div
              className="bg-zinc-900 text-white p-6 rounded-2xl w-[350px] shadow-2xl border border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Add Story</h2>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white border border-zinc-500 transition-colors text-2xl font-semibold leading-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeAddStoryModal();
                  }}
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>

              <input
                type="text"
                placeholder="Title"
                className="w-full mb-3 p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) =>
                  setSelectedLocation((prev) => ({
                    ...prev!,
                    title: e.target.value,
                  }))
                }
              />

              <textarea
                placeholder="What did it feel like?"
                className="w-full mb-4 p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                onChange={(e) =>
                  setSelectedLocation((prev) => ({
                    ...prev!,
                    description: e.target.value,
                  }))
                }
              />

              <input
                type="file"
                accept="image/*"
                className="w-full mb-3 text-sm text-zinc-400"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedLocation((prev) => ({
                      ...prev!,
                      imageFile: file,
                    }));
                  }
                }}
              />
              {selectedLocation?.imageFile && imagePreviewUrl && (
                <div className="relative mb-3">
                  <img
                    src={imagePreviewUrl}
                    alt="Selected story preview"
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                  <button
                    className="absolute top-1 right-1 bg-black/60 text-white px-2 rounded"
                    onClick={() =>
                      setSelectedLocation((prev) => ({
                        ...prev!,
                        imageFile: undefined,
                      }))
                    }
                  >
                    ✕
                  </button>
                </div>
              )}

              <button
                className="w-full bg-blue-500 hover:bg-blue-600 transition-all py-2.5 rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSaving}
                onClick={async () => {
                  if (
                    !selectedLocation?.title?.trim() ||
                    !selectedLocation?.description?.trim()
                  ) {
                    setSaveError("Please fill in title and description.");
                    return;
                  }
                  setIsSaving(true);
                  setSaveError(null);
                  try {
                    let imageUrl = null;
                    if (selectedLocation.imageFile) {
                      const formData = new FormData();
                      formData.append("file", selectedLocation.imageFile);
                      formData.append("upload_preset", "travel-map");
                      const res = await fetch(
                        "https://api.cloudinary.com/v1_1/dupwoxrti/image/upload",
                        {
                          method: "POST",
                          body: formData,
                        },
                      );
                      const data = await res.json();
                      imageUrl = data.secure_url;
                    }
                    const storyPayload = { ...selectedLocation };
                    delete storyPayload.imageFile;
                    const res = await fetch(`${API_BASE_URL}/stories`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        ...storyPayload,
                        imageUrl,
                        userId,
                      }),
                    });
                    if (!res.ok) throw new Error("Failed to save story");
                    const newStory = await res.json();
                    setStories((prev) => [...prev, newStory]);
                    setSelectedLocation(null);
                    toast.success("Story saved successfully ✨");
                  } catch (error) {
                    console.error(error);
                    setSaveError(
                      "Could not save story. Ensure backend is running and reachable.",
                    );
                    toast.error("Failed to save story 😕");
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                {isSaving ? "Saving..." : "Save Story"}
              </button>
              {saveError && (
                <p className="text-red-400 text-sm mt-3">{saveError}</p>
              )}
            </div>
          </div>
        )}
        {mapError && (
          <div className="absolute bottom-4 left-4 z-40 bg-red-900/80 text-red-200 px-3 py-2 rounded-lg border border-red-700 text-sm">
            {mapError}
          </div>
        )}

        <div ref={mapContainer} className="w-full h-full" />
      </div>
    </div>
  );
}
