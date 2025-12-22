
export type GovernmentLevel = 'federal' | 'provincial' | 'municipal';

export interface District {
    id: number;
    name: string;
    slug: string;
    level: GovernmentLevel;
    borough?: string | null; // Only for municipal
    issueCount?: number;
}

// Geographic types for map display
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GeoJSONGeometry = GeoJSON.Geometry;

export interface FederalDistrictGeo {
  id: number;
  name_en: string;
  name_fr: string;
  geom: string; // WKB hex string
  geometry?: GeoJSONGeometry; // Parsed GeoJSON geometry
}

export interface ProvincialDistrictGeo {
  id: number;
  name: string;
  province: string;
  geom: string; // WKB hex string
  geometry?: GeoJSONGeometry; // Parsed GeoJSON geometry
}

export interface MunicipalDistrictGeo {
  id: number;
  city: string;
  name: string;
  borough: string;
  geom: string; // WKB hex string
  geometry?: GeoJSONGeometry; // Parsed GeoJSON geometry
}

export interface ProfileLocation {
  id: string;
  username: string;
  avatar_url?: string;
  coord: {
    lat: number;
    lng: number;
  };
}

export interface MapDistrictData {
  federal: FederalDistrictGeo[];
  provincial: ProvincialDistrictGeo[];
  municipal: MunicipalDistrictGeo[];
}

export interface UserDistrictInfo {
    federal: string | null;
    provincial: string | null;
    municipal: string | null;
    municipalBorough: string | null;
    city: string | null;
    province: string | null;
}
