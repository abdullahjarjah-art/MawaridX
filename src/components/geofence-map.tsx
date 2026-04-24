"use client";

import { useEffect, useRef } from "react";

type Props = {
  lat: number;
  lng: number;
  radius: number;
  draggable?: boolean;
  onChange?: (lat: number, lng: number) => void;
  userLocation?: { lat: number; lng: number } | null;
  height?: number;
};

export function GeofenceMap({ lat, lng, radius, draggable = false, onChange, userLocation, height = 380 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    // Prevent double-init (React StrictMode)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((mapRef.current as any)._leaflet_id) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((mapRef.current as any)._leaflet_id) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!).setView([lat, lng], 17);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      circleRef.current = L.circle([lat, lng], {
        radius,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      const officeIcon = L.divIcon({
        html: `<div style="background:#2563eb;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: "",
      });

      markerRef.current = L.marker([lat, lng], {
        draggable,
        icon: officeIcon,
      }).addTo(map).bindPopup("📍 موقع المكتب");

      if (draggable) {
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current.getLatLng();
          circleRef.current.setLatLng(pos);
          onChange?.(pos.lat, pos.lng);
        });

        map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
          markerRef.current.setLatLng(e.latlng);
          circleRef.current.setLatLng(e.latlng);
          onChange?.(e.latlng.lat, e.latlng.lng);
        });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
        userMarkerRef.current = null;
      }
    };
  }, []);

  // Update map view and marker/circle when lat/lng change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;
    const latlng = { lat, lng };
    markerRef.current.setLatLng(latlng);
    circleRef.current.setLatLng(latlng);
    mapInstanceRef.current.flyTo([lat, lng], mapInstanceRef.current.getZoom(), { animate: true, duration: 0.5 });
  }, [lat, lng]);

  // Update circle radius
  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.setRadius(radius);
  }, [radius]);

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userLocation) {
        const userIcon = L.divIcon({
          html: `<div style="background:#16a34a;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: "",
        });
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup("📍 موقعك الحالي");
      }
    });
  }, [userLocation]);

  return (
    <div
      ref={mapRef}
      style={{ height: `${height}px`, width: "100%", borderRadius: "12px", zIndex: 0 }}
    />
  );
}
