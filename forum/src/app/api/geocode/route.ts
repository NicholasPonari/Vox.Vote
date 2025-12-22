import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { street, city, province } = await request.json();

		if (!street || typeof street !== "string") {
			return NextResponse.json(
				{ error: "Street address is required" },
				{ status: 400 }
			);
		}

		const apiKey = process.env.GEOCODIO_API_KEY;
		if (!apiKey) {
			console.error("GEOCODIO_API_KEY is not configured");
			return NextResponse.json(
				{ error: "Geocoding service not configured" },
				{ status: 500 }
			);
		}

		// Build structured query params for more accurate results
		const params = new URLSearchParams({
			api_key: apiKey,
			country: "CA",
			street: street,
		});
		if (city) params.append("city", city);
		if (province) params.append("state", province);

		const response = await fetch(
			`https://api.geocod.io/v1.7/geocode?${params.toString()}`
		);

		if (!response.ok) {
			console.error("Geocodio API error:", response.status, response.statusText);
			return NextResponse.json(
				{ error: "Failed to geocode address" },
				{ status: 500 }
			);
		}

		const data = await response.json();

		if (!data.results || data.results.length === 0) {
			return NextResponse.json(
				{ error: "Address not found", coordinates: null },
				{ status: 200 }
			);
		}

		const { lat, lng } = data.results[0].location;

		return NextResponse.json({
			coordinates: { lat, lng },
			formatted_address: data.results[0].formatted_address,
		});
	} catch (error) {
		console.error("Geocode error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
