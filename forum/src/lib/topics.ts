import {
	Accessibility,
	Baby,
	Banknote,
	Briefcase,
	Building,
	Bus,
	GraduationCap,
	Heart,
	Layers,
	Leaf,
	Scale,
	Shield,
	TreePine,
	Users,
	type LucideIcon,
} from "lucide-react";

export type TopicId =
	| "general"
	| "healthcare"
	| "economy"
	| "housing"
	| "climate"
	| "education"
	| "transit"
	| "immigration"
	| "indigenous"
	| "defense"
	| "justice"
	| "childcare"
	| "accessibility"
	| "budget"
	| "other";

export type TopicConfig = {
	label: string;
	icon: LucideIcon;
	color: string;
};

export const TOPICS: Record<TopicId, TopicConfig> = {
	general: {
		label: "General",
		icon: Layers,
		color: "bg-gray-100 text-gray-600",
	},
	healthcare: {
		label: "Healthcare",
		icon: Heart,
		color: "bg-red-100 text-red-600",
	},
	economy: {
		label: "Economy & Jobs",
		icon: Banknote,
		color: "bg-green-100 text-green-600",
	},
	housing: {
		label: "Housing",
		icon: Building,
		color: "bg-blue-100 text-blue-600",
	},
	climate: {
		label: "Climate & Environment",
		icon: Leaf,
		color: "bg-emerald-100 text-emerald-600",
	},
	education: {
		label: "Education",
		icon: GraduationCap,
		color: "bg-purple-100 text-purple-600",
	},
	transit: {
		label: "Transit & Infrastructure",
		icon: Bus,
		color: "bg-orange-100 text-orange-600",
	},
	immigration: {
		label: "Immigration",
		icon: Users,
		color: "bg-cyan-100 text-cyan-600",
	},
	indigenous: {
		label: "Indigenous Affairs",
		icon: TreePine,
		color: "bg-amber-100 text-amber-600",
	},
	defense: {
		label: "Defense & Security",
		icon: Shield,
		color: "bg-slate-100 text-slate-600",
	},
	justice: {
		label: "Justice & Law",
		icon: Scale,
		color: "bg-indigo-100 text-indigo-600",
	},
	childcare: {
		label: "Childcare & Families",
		icon: Baby,
		color: "bg-pink-100 text-pink-600",
	},
	accessibility: {
		label: "Accessibility",
		icon: Accessibility,
		color: "bg-violet-100 text-violet-600",
	},
	budget: {
		label: "Budget & Taxes",
		icon: Briefcase,
		color: "bg-gray-100 text-gray-600",
	},
	other: {
		label: "Other",
		icon: Layers,
		color: "bg-gray-100 text-gray-600",
	},
};

export function getTopicConfig(topic: string | null | undefined): TopicConfig | null {
	if (!topic) return null;

	if (Object.prototype.hasOwnProperty.call(TOPICS, topic)) {
		return TOPICS[topic as TopicId];
	}

	return null;
}

export function getTopicLabel(topic: string | null | undefined): string {
	const config = getTopicConfig(topic);
	return config?.label ?? topic ?? "";
}

export const TOPIC_IDS: TopicId[] = [
	"general",
	"healthcare",
	"economy",
	"housing",
	"climate",
	"education",
	"transit",
	"immigration",
	"indigenous",
	"defense",
	"justice",
	"childcare",
	"accessibility",
	"budget",
	"other",
];

export const TOPICS_LIST = TOPIC_IDS.map((id) => ({
	id,
	...TOPICS[id],
}));
