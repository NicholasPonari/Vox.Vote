import { ChevronRight, ChevronDown, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function NavSectionHeader({
	icon: Icon,
	label,
	isOpen,
	onToggle,
	collapsed,
	badge,
}: {
	icon: typeof Home;
	label: string;
	isOpen: boolean;
	onToggle: () => void;
	collapsed?: boolean;
	badge?: number | string;
}) {
	if (collapsed) return null;

	return (
		<button
			onClick={onToggle}
			className="flex items-center w-full px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors group"
		>
			<Icon className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-foreground" />
			<span className="flex-1 text-left">{label}</span>
			{badge && (
				<Badge variant="secondary" className="mr-2 text-xs h-5">
					{badge}
				</Badge>
			)}
			{isOpen ? (
				<ChevronDown className="w-4 h-4 text-muted-foreground" />
			) : (
				<ChevronRight className="w-4 h-4 text-muted-foreground" />
			)}
		</button>
	);
}
