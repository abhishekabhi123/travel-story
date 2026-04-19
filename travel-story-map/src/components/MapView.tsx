import { useEffect, useRef } from "react";
import mapbox from "mapbox-gl"

mapbox.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapView() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null)

    useEffect(() => {
        if (mapRef.current) return;

        mapRef.current = new mapbox.Map({
            container: mapContainer.current!,
            style: "mapbox://styles/mapbox/dark-v11",
            center: [75.7804, 11.2588], // Calicut 👀
            zoom: 12,

        })
    }, [])


    return <div ref={mapContainer} className="w-full h-full" />;
}