
import { Building2, Landmark, MapPinned } from "lucide-react";
import { GovernmentLevel } from "@/lib/types/geo";

export const PROVINCES = [
	{ code: "ON", name: "Ontario" },
	{ code: "QC", name: "Quebec" },
	{ code: "BC", name: "British Columbia" },
	{ code: "AB", name: "Alberta" },
	{ code: "MB", name: "Manitoba" },
	{ code: "SK", name: "Saskatchewan" },
	{ code: "NS", name: "Nova Scotia" },
	{ code: "NB", name: "New Brunswick" },
	{ code: "NL", name: "Newfoundland and Labrador" },
	{ code: "PE", name: "Prince Edward Island" },
	{ code: "NT", name: "Northwest Territories" },
	{ code: "YT", name: "Yukon" },
	{ code: "NU", name: "Nunavut" },
] as const;

export const GOVERNMENT_LEVELS: {
	level: GovernmentLevel;
	label: string;
	icon: typeof Building2;
}[] = [
	{ level: "federal", label: "Federal", icon: Building2 },
	{ level: "provincial", label: "Provincial", icon: Landmark },
	{ level: "municipal", label: "Municipal", icon: MapPinned },
];
