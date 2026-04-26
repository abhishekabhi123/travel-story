import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export default function MapView() {

    type StoryLocation = {
        lng: number;
        lat: number;
        title?: string;
        description?: string;
    };
    type Story = StoryLocation & { _id?: string };
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    // const [markers, setMarkers] = useState<{ lng: number, lat: number }[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<StoryLocation | null>(null);
    const [stories, setStories] = useState<Story[]>([])
    const [isMapReady, setIsMapReady] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);

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

        })


        map.on("click", (e) => {
            const target = e.originalEvent.target as HTMLElement;
            if (target.closest(".mapboxgl-marker")) return;
            const { lng, lat } = e.lngLat;
            setSaveError(null);
            setSelectedLocation({ lng, lat })


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
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        stories.forEach((story) => {
            const lng = Number(story.lng);
            const lat = Number(story.lat);
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

            const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
  <div style="font-family: sans-serif; max-width: 200px;">
    <h3 style="font-weight: 600; margin-bottom: 4px;">
      ${story.title || "Untitled"}
    </h3>
    <p style="font-size: 13px; color: #555;">
      ${story.description || "No description"}
    </p>
  </div>
`);
            const marker = new mapboxgl.Marker({ color: "#3b82f6", scale: 1.1 })
                .setLngLat([lng, lat])
                .setPopup(popup)
                .addTo(mapRef.current!)
            markersRef.current.push(marker)
        })

    }, [stories, isMapReady])


    return <>
        <div className="absolute top-4 left-4 z-40 bg-zinc-900/80 backdrop-blur-md text-white px-4 py-2 rounded-xl border border-zinc-700 shadow-lg">
            <p className="text-sm font-medium">Travel Story Map</p>
            <p className="text-xs text-zinc-400">{stories.length} stories</p>
        </div>
        {selectedLocation && (
            <div
                className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
                onClick={() => {
                    setSelectedLocation(null);
                    setSaveError(null);
                }}
            >
                <div
                    className="bg-zinc-900 text-white p-6 rounded-2xl w-[350px] shadow-2xl border border-zinc-800"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Add Story</h2>
                        <button
                            type="button"
                            className="text-zinc-400 hover:text-white text-xl leading-none px-2"
                            onClick={() => {
                                setSelectedLocation(null);
                                setSaveError(null);
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

                    <button
                        className="w-full bg-blue-500 hover:bg-blue-600 transition-all py-2.5 rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isSaving}
                        onClick={async () => {
                            if (!selectedLocation) return;
                            setIsSaving(true);
                            setSaveError(null);
                            try {
                                const res = await fetch(`${API_BASE_URL}/stories`, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify(selectedLocation),
                                });
                                if (!res.ok) throw new Error("Failed to save story");
                                const newStory = await res.json();
                                setStories((prev) => [...prev, newStory]);
                                setSelectedLocation(null);
                            } catch (error) {
                                console.error(error);
                                setSaveError("Could not save story. Ensure backend is running and reachable.");
                            } finally {
                                setIsSaving(false);
                            }
                        }}
                    >
                        {isSaving ? "Saving..." : "Save Story"}
                    </button>
                    {saveError && <p className="text-red-400 text-sm mt-3">{saveError}</p>}
                </div>
            </div>
        )
        }
        {mapError && (
            <div className="absolute bottom-4 left-4 z-40 bg-red-900/80 text-red-200 px-3 py-2 rounded-lg border border-red-700 text-sm">
                {mapError}
            </div>
        )}
        <div ref={mapContainer} className="w-full h-screen" /></>
}









