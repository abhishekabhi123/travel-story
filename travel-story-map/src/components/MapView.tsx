import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapView() {

    type StoryLocation = {
        lng: number;
        lat: number;
        title?: string;
        description?: string;
    };
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    // const [markers, setMarkers] = useState<{ lng: number, lat: number }[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<StoryLocation | null>(null);
    const [stories, setStories] = useState<any[]>([])

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
            setSelectedLocation({ lng, lat })


        });
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };

    }, []);


    useEffect(() => {
        if (!mapRef.current) return;
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        stories.forEach((story) => {

            const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, closeOnClick: true }).setHTML(`
      <div style="color: black;">
        <h3 style="font-weight: bold;">${story.title || "No Title"}</h3>
        <p>${story.description || "No description"}</p>
      </div>
    `);
            const marker = new mapboxgl.Marker().setLngLat([story.lng, story.lat]).setPopup(popup).addTo(mapRef.current!)
            markersRef.current.push(marker)
        })

    }, [stories])


    return <>
        {selectedLocation && (
            <div className="absolute inset-0 bg-black/50 top-0 left-0 w-full h-full flex items-center justify-center z-50 " onClick={() => setSelectedLocation(null)}>
                <div className="bg-gray-900 p-4 rounded-xl w-80" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-white">Add story</h2>
                    <input type="text" className="w-full mb-2 p-2 rounded bg-gray-800 text-white" placeholder="Title" onChange={(e) =>
                        setSelectedLocation((prev) => ({
                            ...prev,
                            title: e.target.value
                        }))} />
                    <textarea className="w-full mb-2 p-2 rounded bg-gray-800 text-white" placeholder="Description"
                        onChange={(e) => {
                            setSelectedLocation((prev) => ({
                                ...prev,
                                description: e.target.value
                            }))
                        }}
                    />
                    <button className="w-full bg-blue-500 px-4 py-4 rounded text-white" onClick={() => {
                        setStories((prev) => [...prev, selectedLocation]);
                        setSelectedLocation(null);
                    }}>Save</button>
                </div>
            </div>
        )}
        <div ref={mapContainer} className="w-full h-screen" /></>
}