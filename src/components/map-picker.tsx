"use client";

import { useEffect, useRef } from "react";

type Props = {
  lat: number | null;
  lng: number | null;
  radius: number;
  onChange: (lat: number, lng: number) => void;
};

export function MapPicker({ lat, lng, radius, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Prevent double-init (React StrictMode)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((containerRef.current as any)._leaflet_id) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      if (!containerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((containerRef.current as any)._leaflet_id) return;
      // Fix default marker icons
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const defaultLat = lat ?? 24.7136;
      const defaultLng = lng ?? 46.6753; // الرياض افتراضياً

      const map = L.map(containerRef.current!).setView([defaultLat, defaultLng], lat ? 16 : 6);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      if (lat && lng) {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        const circle = L.circle([lat, lng], { radius, color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.15, weight: 2 }).addTo(map);
        circleRef.current = circle;

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          circle.setLatLng(pos);
          onChange(pos.lat, pos.lng);
        });
      }

      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
          circleRef.current?.setLatLng([clickLat, clickLng]);
        } else {
          const marker = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
          markerRef.current = marker;
          const circle = L.circle([clickLat, clickLng], { radius, color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.15, weight: 2 }).addTo(map);
          circleRef.current = circle;

          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            circle.setLatLng(pos);
            onChange(pos.lat, pos.lng);
          });
        }
        onChange(clickLat, clickLng);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  // Update circle radius when radius prop changes
  useEffect(() => {
    circleRef.current?.setRadius(radius);
  }, [radius]);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 280 }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
