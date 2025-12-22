"use client";

import "leaflet/dist/leaflet.css";

import {
	MapContainer,
	TileLayer,
	Marker,
	useMapEvents,
	useMap,
} from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { cn } from "@/lib/utils";

export interface MapPickerProps {
	value?: { lat: number; lng: number } | null;
	onChange?: (coords: { lat: number; lng: number }) => void;
	modalOpen?: boolean;
	className?: string;
}

function MapUpdater({ center }: { center: { lat: number; lng: number } }) {
	const map = useMap();

	useEffect(() => {
		if (center) {
			map.setView([center.lat, center.lng], map.getZoom());
		}
	}, [center, map]);

	return null;
}

function LocationMarker({ value, onChange }: MapPickerProps) {
	const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
		value || null
	);

	useMapEvents({
		click(e: LeafletMouseEvent) {
			setPosition(e.latlng);
			if (onChange) onChange(e.latlng);
		},
	});

	// Create a custom divIcon with the 📌 emoji
	const pinIcon = L.divIcon({
		className: "emoji-marker",
		html: '<span style="font-size: 2rem; line-height: 1;">📌</span>',
		iconSize: [32, 32],
		iconAnchor: [16, 32],
	});

	return position ? <Marker position={position} icon={pinIcon} /> : null;
}

export function MapPicker({
	value,
	onChange,
	modalOpen,
	className,
}: MapPickerProps) {
	const [userLocation, setUserLocation] = useState<{
		lat: number;
		lng: number;
	} | null>(null);
	const mapRef = useRef<L.Map | null>(null);

	// Get user's current location on mount
	useEffect(() => {
		// Try GPS/precise geolocation first
		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					setUserLocation({
						lat: position.coords.latitude,
						lng: position.coords.longitude,
					});
				},
				async (error) => {
					// Fallback to IP-based geolocation
					try {
						const response = await fetch("https://ipapi.co/json/");
						const data = await response.json();
						if (data.latitude && data.longitude) {
							setUserLocation({
								lat: data.latitude,
								lng: data.longitude,
							});
						}
					} catch (ipError) {}
				},
				{
					timeout: 5000,
					maximumAge: 300000, // Cache for 5 minutes
				}
			);
		} else {
			// No geolocation API, try IP-based
			fetch("https://ipapi.co/json/")
				.then((response) => response.json())
				.then((data) => {
					if (data.latitude && data.longitude) {
						setUserLocation({
							lat: data.latitude,
							lng: data.longitude,
						});
					}
				})
				.catch((error) => {});
		}
	}, []);

	const defaultCenter = value ||
		userLocation || { lat: 74.5017, lng: -53.5673 };

	useEffect(() => {
		if (modalOpen && mapRef.current) {
			setTimeout(() => {
				mapRef.current?.invalidateSize();
				setTimeout(() => {
					mapRef.current?.invalidateSize();
				}, 250);
			}, 250);
		}
	}, [modalOpen]);

	return (
		<div
			className={cn("w-full h-64 rounded-lg overflow-hidden border", className)}
		>
			<MapContainer
				center={defaultCenter}
				zoom={13}
				style={{ height: "100%", width: "100%" }}
				scrollWheelZoom={true}
				ref={mapRef}
			>
				<TileLayer
					attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<MapUpdater center={defaultCenter} />
				<LocationMarker value={value} onChange={onChange} />
			</MapContainer>
		</div>
	);
}

export default MapPicker;
