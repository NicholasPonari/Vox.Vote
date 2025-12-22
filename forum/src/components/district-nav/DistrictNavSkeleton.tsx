import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DistrictNavSkeleton({
	collapsed,
	className,
}: {
	collapsed?: boolean;
	className?: string;
}) {
	if (collapsed) {
		return (
			<div
				className={cn("flex flex-col h-full bg-background border-r", className)}
			>
				<div className="flex items-center justify-center px-2 py-2 border-b shrink-0">
					<Skeleton className="h-9 w-9 rounded-full" />
				</div>
				<div className="flex flex-col items-center py-4 space-y-2">
					{Array.from({ length: 5 }).map((_, idx) => (
						<Skeleton key={String(idx)} className="h-10 w-10 rounded-lg" />
					))}
				</div>
				<div className="flex-1" />
			</div>
		);
	}

	return (
		<div
			className={cn("relative flex flex-col h-full bg-background", className)}
		>
			<div className="px-2 py-2">
				<Skeleton className="h-8 w-full rounded-lg" />
			</div>
			<div className="relative flex items-center justify-end px-2 border-b shrink-0">
				<div className="absolute -right-3 top-2 z-10">
					<Skeleton className="h-6 w-6 rounded-full" />
				</div>
			</div>
			<div className="flex-1 px-2 py-2 space-y-2">
				<Skeleton className="h-8 w-full rounded-lg" />
				<Skeleton className="h-8 w-full rounded-lg" />
				<Skeleton className="h-8 w-full rounded-lg" />
				<Skeleton className="h-8 w-full rounded-lg" />
				<Skeleton className="h-8 w-full rounded-lg" />
				<div className="pt-2">
					<Skeleton className="h-24 w-full rounded-lg" />
				</div>
			</div>
		</div>
	);
}
