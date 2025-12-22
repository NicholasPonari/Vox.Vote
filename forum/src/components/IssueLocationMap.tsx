"use client";

import React from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface IssueLocationMapProps {
	latitude: number | null;
	longitude: number | null;
	address?: string;
}

// Fix for Leaflet default markers in Next.js
if (typeof window !== "undefined") {
	delete (
		L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => void }
	)._getIconUrl;
	L.Icon.Default.mergeOptions({
		iconRetinaUrl:
			"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
		iconUrl:
			"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
		shadowUrl:
			"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
	});
}

// Custom marker icon
const createLocationIcon = () => {
	return L.divIcon({
		html: `
			<div class="relative">
				<div class="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
					<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
					</svg>
				</div>
			</div>
		`,
		className: "custom-div-icon",
		iconSize: [32, 32],
		iconAnchor: [16, 32],
	});
};

export function IssueLocationMap({
	latitude,
	longitude,
	address,
}: IssueLocationMapProps) {
	// Don't render the map if coordinates are missing
	if (latitude === null || longitude === null) {
		return null;
	}

	return (
		<div className="w-full mt-4">
			<div className="rounded-xl overflow-hidden border shadow-sm">
				<MapContainer
					center={[latitude, longitude]}
					zoom={15}
					style={{ height: "300px", width: "100%", zIndex: 0 }}
					scrollWheelZoom={false}
					dragging={true}
					zoomControl={true}
				>
					<TileLayer
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					/>
					<Marker position={[latitude, longitude]} icon={createLocationIcon()} />
				</MapContainer>
			</div>
			{address && (
				<div className="mt-2 text-sm text-gray-600 flex items-center gap-1">
					<svg
						className="w-4 h-4"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
							clipRule="evenodd"
						/>
					</svg>
					<span>{address}</span>
				</div>
			)}
		</div>
	);
}
