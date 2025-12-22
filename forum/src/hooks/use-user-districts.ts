
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchUserDistricts } from "@/lib/utils/districtGeometry";
import {
  UserDistrictInfo,
  MapDistrictData,
  ProfileLocation,
} from "@/lib/types/geo";

export function useUserDistricts() {
  const { profile } = useAuth();
  const [userDistricts, setUserDistricts] = useState<UserDistrictInfo | null>(null);
  const [mapDistricts, setMapDistricts] = useState<MapDistrictData | null>(null);
  const [profileLocation, setProfileLocation] = useState<ProfileLocation | null>(null);

  useEffect(() => {
    async function loadUserDistricts() {
      if (!profile) {
        setUserDistricts(null);
        setMapDistricts(null);
        setProfileLocation(null);
        return;
      }

      // 1. Prepare base district info from profile (PostgreSQL relations)
      const info: UserDistrictInfo = {
        federal: profile.federal_district?.name_en ?? null,
        provincial: profile.provincial_district?.name ?? null,
        municipal: profile.municipal_district?.name ?? null,
        municipalBorough: profile.municipal_district?.borough ?? null,
        city: profile.municipal_district?.city ?? null,
        province: profile.provincial_district?.province ?? null,
      };

      // 2. Parse coordinates
      let lat: number | null = null;
      let lng: number | null = null;

      if (profile.coord) {
        const c =
          typeof profile.coord === "string"
            ? JSON.parse(profile.coord)
            : profile.coord;
        if (c?.lat && c?.lng) {
          const parsedLat = c.lat;
          const parsedLng = c.lng;
          lat = parsedLat;
          lng = parsedLng;
          setProfileLocation({
            id: profile.id || "",
            username: profile.username || "You",
            avatar_url: profile.avatar_url ?? undefined,
            coord: { lat: parsedLat, lng: parsedLng },
          });
        }
      }

      // 3. Fetch Map Geometries
      if (lat !== null && lng !== null) {
        try {
          const geometryData = await fetchUserDistricts(lat, lng);
          setMapDistricts(geometryData);
        } catch (e) {
          console.error("Error fetching district geometries:", e);
        }
      }

      setUserDistricts(info);
    }

    loadUserDistricts();
  }, [profile]);

  return { userDistricts, mapDistricts, profileLocation };
}
