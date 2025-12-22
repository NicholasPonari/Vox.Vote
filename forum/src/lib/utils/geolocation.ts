import { createClient } from "@/lib/supabaseClient";

/**
 * Find which Montreal district (arrondissement) a coordinate falls into using PostGIS
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns The arrondissement name or null if not found
 */
export async function findMunicipalDistrict(lat: number, lng: number): Promise<string | null> {
	const supabase = createClient();
	
	// Use PostGIS ST_Contains to check if the point is within any district geometry
	// Note: PostGIS uses (longitude, latitude) order, which is (x, y)
	const { data, error } = await supabase.rpc('find_municipal_district', { lat, lng });

	if (error) {
		console.error('❌ Error finding municipal district:', error);
		return null;
	}

	if (!data) {
		console.warn('⚠️ No municipal district found for coordinates');
		return null;
	}

	// The RPC returns a JSON object with borough, name, and display fields
	// Supabase automatically parses the JSON, so data is already the object
	let result: string | null = null;
	
	if (typeof data === 'string') {
		// If it's a string, it's the display value directly
		result = data;
	} else if (typeof data === 'object' && data !== null) {
		// If it's an object, extract the borough field
		result = data.borough || null;
	}
	
	return result;
}

/**
 * Find which Quebec provincial district (région administrative) a coordinate falls into using PostGIS
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns The provincial district name or null if not found
 */
export async function findProvincialDistrict(lat: number, lng: number): Promise<string | null> {
	const supabase = createClient();
	
	// Use PostGIS ST_Contains to check if the point is within any district geometry
	// Note: PostGIS uses (longitude, latitude) order, which is (x, y)
	const { data, error } = await supabase.rpc('find_provincial_district', { lat, lng });

	if (error) {
		console.error('❌ Error finding provincial district:', error);
		return null;
	}
	
	if (!data) {
		console.warn('⚠️ No provincial district found for coordinates');
		return null;
	}

	// The RPC returns just the district name as a string
	const result = data || null;
	return result;
}

/**
 * Find which Federal district (riding) a coordinate falls into using PostGIS
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns The federal district name or null if not found
 */
export async function findFederalDistrict(lat: number, lng: number): Promise<string | null> {
	const supabase = createClient();
	
	// Use PostGIS ST_Contains to check if the point is within any district geometry
	// Note: PostGIS uses (longitude, latitude) order, which is (x, y)
	const { data, error } = await supabase.rpc('find_federal_district', { lat, lng });

	if (error) {
		console.error('❌ Error finding federal district:', error);
		return null;
	}
	
	if (!data) {
		console.warn('⚠️ No federal district found for coordinates');
		return null;
	}

	// The RPC returns just the district name as a string
	const result = data || null;
	return result;
}

/**
 * Find municipal, provincial, and federal districts for a coordinate
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Object containing district names
 */
export async function findDistricts(lat: number, lng: number): Promise<{
	municipalDistrict: string | null;
	provincialDistrict: string | null;
	federalDistrict: string | null;
}> {
	return {
		municipalDistrict: await findMunicipalDistrict(lat, lng),
		provincialDistrict: await findProvincialDistrict(lat, lng),
		federalDistrict: await findFederalDistrict(lat, lng),
	};
}
