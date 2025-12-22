import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Home } from "lucide-react";
import { GovernmentLevel } from "@/lib/types/geo";

// Collapsed Nav Item with Tooltip
export function CollapsedNavItem({
	href,
	icon: Icon,
	label,
	isActive,
}: {
	href: string;
	icon: typeof Home;
	label: string;
	isActive: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Link
					href={href}
					className={cn(
						"flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
						isActive
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					)}
				>
					<Icon className="w-5 h-5" />
				</Link>
			</TooltipTrigger>
			<TooltipContent side="right" sideOffset={8}>
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

// Nav Item
export function NavItem({
	href,
	icon: Icon,
	label,
	isActive,
	indent = false,
	badge,
}: {
	href: string;
	icon?: typeof Home;
	label: string;
	isActive: boolean;
	indent?: boolean;
	badge?: number | string;
}) {
	return (
		<Link
			href={href}
			className={cn(
				"flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors",
				indent && "ml-6",
				isActive
					? "bg-primary/10 text-primary font-medium"
					: "text-muted-foreground hover:bg-accent hover:text-foreground"
			)}
		>
			{Icon && <Icon className="w-4 h-4 mr-2 shrink-0" />}
			<span className="flex-1 truncate">{label}</span>
			{badge && (
				<Badge variant="outline" className="ml-2 text-xs h-5 shrink-0">
					{badge}
				</Badge>
			)}
		</Link>
	);
}

// Level Badge
export function LevelBadge({ level }: { level: GovernmentLevel }) {
	const colors = {
		federal: "bg-blue-100 text-blue-700 border-blue-200",
		provincial: "bg-emerald-100 text-emerald-700 border-emerald-200",
		municipal: "bg-amber-100 text-amber-700 border-amber-200",
	};

	return (
		<span
			className={cn(
				"inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded border",
				colors[level]
			)}
		>
			{level.charAt(0).toUpperCase()}
		</span>
	);
}
