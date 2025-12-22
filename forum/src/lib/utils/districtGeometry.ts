import { createClient } from "@/lib/supabaseClient";
import type {
	FederalDistrictGeo,
	ProvincialDistrictGeo,
	MunicipalDistrictGeo,
	MapDistrictData,
	GeoJSONGeometry,
} from "@/lib/types/geo";

const userDistrictsCache = new Map<
	string,
	{ data: MapDistrictData; expiresAt: number }
>();
const userDistrictsInFlight = new Map<string, Promise<MapDistrictData>>();

/**
 * Parse WKB hex string to GeoJSON geometry
 * Uses wkx library - works in Node.js environment only
 */
export function parseWKBToGeoJSON(wkbHex: string): GeoJSONGeometry | null {
	// Only attempt in Node.js environment where Buffer exists
	if (typeof window !== "undefined") {
		return null;
	}
	
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const wkx = require("wkx");
		const buffer = Buffer.from(wkbHex, "hex");
		const geometry = wkx.Geometry.parse(buffer);
		return geometry.toGeoJSON() as GeoJSONGeometry;
	} catch (error) {
		return null;
	}
}

/**
 * Fetch federal districts near a coordinate with GeoJSON geometry
 * Uses PostGIS ST_AsGeoJSON for reliable conversion
 */
export async function fetchFederalDistrictsNear(
	lat: number,
	lng: number,
	radiusKm: number = 50
): Promise<FederalDistrictGeo[]> {
	const supabase = createClient();

	// Use RPC to get districts with GeoJSON conversion done in PostGIS
	const { data, error } = await supabase.rpc("get_federal_districts_near", {
		p_lat: lat,
		p_lng: lng,
		p_radius_km: radiusKm,
	});

	if (error) {
		// Fallback: fetch all and filter client-side
		return fetchFederalDistrictsFallback(lat, lng, radiusKm);
	}

	return data || [];
}

/**
 * Fetch provincial districts near a coordinate with GeoJSON geometry
 */
export async function fetchProvincialDistrictsNear(
	lat: number,
	lng: number,
	radiusKm: number = 50
): Promise<ProvincialDistrictGeo[]> {
	const supabase = createClient();

	const { data, error } = await supabase.rpc("get_provincial_districts_near", {
		p_lat: lat,
		p_lng: lng,
		p_radius_km: radiusKm,
	});

	if (error) {
		return fetchProvincialDistrictsFallback(lat, lng, radiusKm);
	}

	return data || [];
}

/**
 * Fetch municipal districts near a coordinate with GeoJSON geometry
 */
export async function fetchMunicipalDistrictsNear(
	lat: number,
	lng: number,
	radiusKm: number = 30
): Promise<MunicipalDistrictGeo[]> {
	const supabase = createClient();

	const { data, error } = await supabase.rpc("get_municipal_districts_near", {
		p_lat: lat,
		p_lng: lng,
		p_radius_km: radiusKm,
	});

	if (error) {
		return fetchMunicipalDistrictsFallback(lat, lng, radiusKm);
	}

	return data || [];
}

/**
 * Fetch all district types near a coordinate
 */
export async function fetchDistrictsNear(
	lat: number,
	lng: number,
	radiusKm: number = 50
): Promise<MapDistrictData> {
	const [federal, provincial, municipal] = await Promise.all([
		fetchFederalDistrictsNear(lat, lng, radiusKm),
		fetchProvincialDistrictsNear(lat, lng, radiusKm),
		fetchMunicipalDistrictsNear(lat, lng, Math.min(radiusKm, 30)),
	]);

	return { federal, provincial, municipal };
}

/**
 * Fetch only the districts that contain a specific point (user's location)
 * Returns exactly one district per level (the one the user lives in)
 */
export async function fetchUserDistricts(
	lat: number,
	lng: number
): Promise<MapDistrictData> {
	const cacheKey = `${lat},${lng}`;
	const cached = userDistrictsCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data;
	}

	const inFlight = userDistrictsInFlight.get(cacheKey);
	if (inFlight) {
		return inFlight;
	}

	const supabase = createClient();

	const promise = (async () => {
		// Fetch the single district at each level that contains the user's point
		const [federalResult, provincialResult, municipalResult] =
			await Promise.all([
				supabase.rpc("get_federal_district_at_point", { p_lat: lat, p_lng: lng }),
				supabase.rpc("get_provincial_district_at_point", {
					p_lat: lat,
					p_lng: lng,
				}),
				supabase.rpc("get_municipal_district_at_point", {
					p_lat: lat,
					p_lng: lng,
				}),
			]);

		// RPC may return a single object or an array - normalize to flat array
		const federal: FederalDistrictGeo[] = federalResult.data
			? Array.isArray(federalResult.data)
				? federalResult.data.flat()
				: [federalResult.data]
			: [];
		const provincial: ProvincialDistrictGeo[] = provincialResult.data
			? Array.isArray(provincialResult.data)
				? provincialResult.data.flat()
				: [provincialResult.data]
			: [];
		const municipal: MunicipalDistrictGeo[] = municipalResult.data
			? Array.isArray(municipalResult.data)
				? municipalResult.data.flat()
				: [municipalResult.data]
			: [];

		const data = { federal, provincial, municipal };
		userDistrictsCache.set(cacheKey, {
			data,
			expiresAt: Date.now() + 5 * 60 * 1000,
		});
		return data;
	})();

	userDistrictsInFlight.set(cacheKey, promise);
	try {
		return await promise;
	} finally {
		userDistrictsInFlight.delete(cacheKey);
	}
}

// Fallback functions that fetch from table directly and convert WKB client-side
async function fetchFederalDistrictsFallback(
	lat: number,
	lng: number,
	radiusKm: number
): Promise<FederalDistrictGeo[]> {
	const supabase = createClient();

	// Fetch districts that contain the point or are nearby
	// This is a simplified approach - ideally use PostGIS spatial query
	const { data, error } = await supabase
		.from("federal_districts")
		.select("id, name_en, name_fr, geom")
		.limit(10);

	if (error || !data) {
		return [];
	}

	// Convert WKB to GeoJSON for each district
	return data.map((district) => ({
		...district,
		geometry: parseWKBToGeoJSON(district.geom) || undefined,
	}));
}

async function fetchProvincialDistrictsFallback(
	lat: number,
	lng: number,
	radiusKm: number
): Promise<ProvincialDistrictGeo[]> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from("provincial_districts")
		.select("id, name, province, geom")
		.limit(10);

	if (error || !data) {
		return [];
	}

	return data.map((district) => ({
		...district,
		geometry: parseWKBToGeoJSON(district.geom) || undefined,
	}));
}

async function fetchMunicipalDistrictsFallback(
	lat: number,
	lng: number,
	radiusKm: number
): Promise<MunicipalDistrictGeo[]> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from("municipal_districts")
		.select("id, name, city, borough, geom")
		.limit(20);

	if (error || !data) {
		return [];
	}

	return data.map((district) => ({
		...district,
		geometry: parseWKBToGeoJSON(district.geom) || undefined,
	}));
}

/**
 * Get district containing a specific point
 */
export async function getDistrictContainingPoint(
	lat: number,
	lng: number,
	level: "federal" | "provincial" | "municipal"
): Promise<FederalDistrictGeo | ProvincialDistrictGeo | MunicipalDistrictGeo | null> {
	const supabase = createClient();
	const tableName = `${level}_districts`;

	const { data, error } = await supabase.rpc(`get_${level}_district_at_point`, {
		p_lat: lat,
		p_lng: lng,
	});

	if (error) {
		return null;
	}

	return data || null;
}

/**
 * Convert raw district data with geom to include parsed geometry
 */
export function convertDistrictsToGeoJSON<T extends { geom: string }>(
	districts: T[]
): (T & { geometry?: GeoJSONGeometry })[] {
	return districts.map((district) => ({
		...district,
		geometry: parseWKBToGeoJSON(district.geom) || undefined,
	}));
}
