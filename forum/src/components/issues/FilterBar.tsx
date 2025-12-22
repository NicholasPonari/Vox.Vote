import { useRef, useState, useEffect } from "react";
import { Search, Building2, Home, MapPin, Globe } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { GovernmentLevel } from "@/lib/types/geo";
import { SortOption } from "@/hooks/use-issue-filters";

interface FilterBarProps {
	// State
	governmentLevel: GovernmentLevel | null;
	searchQuery: string;
	sortBy: SortOption;
	districtFilter: string | null;
	typeFilter: string | null;
	userRoleFilter: string | null;

	// Options
	availableTypes: string[];
	availableDistricts: string[];

	// Setters
	onLevelChange: (level: GovernmentLevel | null) => void;
	onSearchChange: (query: string) => void;
	onSortChange: (sort: SortOption) => void;
	onDistrictChange: (district: string | null) => void;
	onTypeChange: (type: string | null) => void;
	onUserRoleChange: (role: string | null) => void;
}

const LEVEL_TABS: {
	level: GovernmentLevel | null;
	label: string;
	shortLabel: string;
	icon: React.ReactNode;
}[] = [
	{
		level: null,
		label: "All",
		shortLabel: "All",
		icon: <Globe className="w-4 h-4" />,
	},
	{
		level: "federal",
		label: "Federal",
		shortLabel: "Fed",
		icon: <Building2 className="w-4 h-4" />,
	},
	{
		level: "provincial",
		label: "Provincial",
		shortLabel: "Prov",
		icon: <Home className="w-4 h-4" />,
	},
	{
		level: "municipal",
		label: "Municipal",
		shortLabel: "Muni",
		icon: <MapPin className="w-4 h-4" />,
	},
];

const USER_ROLES = ["Resident", "Politician", "Candidate"];

export function FilterBar({
	governmentLevel,
	searchQuery,
	sortBy,
	districtFilter,
	typeFilter,
	userRoleFilter,
	availableTypes,
	availableDistricts,
	onLevelChange,
	onSearchChange,
	onSortChange,
	onDistrictChange,
	onTypeChange,
	onUserRoleChange,
}: FilterBarProps) {
	const [isFilterSticky, setIsFilterSticky] = useState(false);
	const [isSearchExpanded, setIsSearchExpanded] = useState(false);
	const filterBarRef = useRef<HTMLDivElement>(null);
	const filterPlaceholderRef = useRef<HTMLDivElement>(null);

	// Track filter bar sticky behavior
	useEffect(() => {
		const handleScroll = () => {
			if (!filterBarRef.current) return;

			const filterBarTop =
				filterPlaceholderRef.current?.getBoundingClientRect().top || 0;
			const headerHeight = 64; // h-16 class = 64px

			// Make sticky when filter bar would go past the header
			if (filterBarTop <= headerHeight) {
				setIsFilterSticky(true);
			} else {
				setIsFilterSticky(false);
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<>
			{/* Desktop: Level Tabs */}
			<div className="hidden md:flex items-center gap-2 mb-4">
				{LEVEL_TABS.map((tab) => (
					<button
						key={tab.level ?? "all"}
						onClick={() => onLevelChange(tab.level)}
						className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
							governmentLevel === tab.level
								? "bg-primary text-white"
								: "bg-gray-100 text-gray-600 hover:bg-gray-200"
						}`}
					>
						{tab.icon}
						<span>{tab.label}</span>
					</button>
				))}
			</div>

			{/* Desktop: Separate Search Bar */}
			<div className="relative mb-6 hidden md:block">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
				<Input
					type="text"
					placeholder="Search by title, description, address, or username..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-10 rounded-xl"
				/>
			</div>

			{/* Desktop: Filter Controls */}
			<div className="hidden md:flex flex-wrap gap-3">
				{/* Sort By - Dropdown */}
				<Select
					value={sortBy}
					onValueChange={(value) => onSortChange(value as SortOption)}
				>
					<SelectTrigger className="w-[180px] rounded-xl">
						<SelectValue placeholder="Sort By" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="new">New</SelectItem>
						<SelectItem value="popular">Popular</SelectItem>
						<SelectItem value="controversial">Controversial</SelectItem>
					</SelectContent>
				</Select>
				{/* District Filter - Dropdown (only when level is selected) */}
				{governmentLevel && (
					<Select
						value={districtFilter || "all"}
						onValueChange={(value) =>
							onDistrictChange(value === "all" ? null : value)
						}
					>
						<SelectTrigger className="w-[180px] rounded-xl">
							<SelectValue placeholder="District" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Districts</SelectItem>
							{availableDistricts.map((district) => (
								<SelectItem key={district} value={district}>
									{district}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{/* Type Filter - Dropdown */}
				<Select
					value={typeFilter || "all"}
					onValueChange={(value) =>
						onTypeChange(value === "all" ? null : value)
					}
				>
					<SelectTrigger className="w-[180px] rounded-xl">
						<SelectValue placeholder="Type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Types</SelectItem>
						{availableTypes.map((type) => (
							<SelectItem key={type} value={type} className="capitalize">
								{type}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* User Role Filter - Dropdown */}
				<Select
					value={userRoleFilter || "all"}
					onValueChange={(value) =>
						onUserRoleChange(value === "all" ? null : value)
					}
				>
					<SelectTrigger className="w-[180px] rounded-xl">
						<SelectValue placeholder="User Role" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Users</SelectItem>
						{USER_ROLES.map((role) => (
							<SelectItem key={role} value={role}>
								{role}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Mobile: Level Tabs */}
			<div className="md:hidden flex items-center gap-1 mb-3 overflow-x-auto scrollbar-hide px-1">
				{LEVEL_TABS.map((tab) => (
					<button
						key={tab.level ?? "all"}
						onClick={() => onLevelChange(tab.level)}
						className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
							governmentLevel === tab.level
								? "bg-primary text-white"
								: "bg-gray-100 text-gray-600"
						}`}
					>
						{tab.icon}
						<span>{tab.shortLabel}</span>
					</button>
				))}
			</div>

			{/* Mobile: Compact Filter Bar with Expandable Search */}
			<div
				ref={filterPlaceholderRef}
				className="md:hidden mb-6"
				style={
					isFilterSticky
						? { height: filterBarRef.current?.offsetHeight || "auto" }
						: {}
				}
			>
				<div
					ref={filterBarRef}
					className={`bg-black text-white overflow-hidden transition-all duration-200 p-2 ${
						isFilterSticky
							? "fixed top-16 left-0 right-0 z-40 rounded-none shadow-lg"
							: "rounded-xl"
					}`}
					style={isFilterSticky ? { maxWidth: "100vw" } : {}}
				>
					{/* Filter Bar */}
					<div className="flex items-center gap-2">
						{/* Search Icon Button */}
						<button
							onClick={() => setIsSearchExpanded(!isSearchExpanded)}
							className="flex-shrink-0 p-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-all shadow-sm"
							aria-label="Toggle search"
						>
							<Search className="w-5 h-5 text-gray-300" />
						</button>

						{/* Sort By */}
						<Select
							value={sortBy}
							onValueChange={(value) => onSortChange(value as SortOption)}
						>
							<SelectTrigger className="border-0 bg-transparent text-xs font-medium text-white hover:bg-gray-800 h-auto py-2 px-1 flex-1 min-w-0 gap-1 [&>svg]:text-gray-400 [&>svg]:opacity-100">
								<SelectValue placeholder="Sort" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="new">New</SelectItem>
								<SelectItem value="popular">Popular</SelectItem>
								<SelectItem value="controversial">Controversial</SelectItem>
							</SelectContent>
						</Select>

						{/* District Filter (only when level is selected) */}
						{governmentLevel && (
							<Select
								value={districtFilter || "all"}
								onValueChange={(value) =>
									onDistrictChange(value === "all" ? null : value)
								}
							>
								<SelectTrigger className="border-0 bg-transparent text-xs font-medium text-white hover:bg-gray-800 h-auto py-2 px-1 flex-1 min-w-0 gap-1 [&>svg]:text-gray-400 [&>svg]:opacity-100">
									<SelectValue placeholder="District" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Districts</SelectItem>
									{availableDistricts.map((district) => (
										<SelectItem key={district} value={district}>
											{district}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}

						{/* Type Filter */}
						<Select
							value={typeFilter || "all"}
							onValueChange={(value) =>
								onTypeChange(value === "all" ? null : value)
							}
						>
							<SelectTrigger className="border-0 bg-transparent text-xs font-medium text-white hover:bg-gray-800 h-auto py-2 px-1 flex-1 min-w-0 gap-1 [&>svg]:text-gray-400 [&>svg]:opacity-100">
								<SelectValue placeholder="Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								{availableTypes.map((type) => (
									<SelectItem key={type} value={type} className="capitalize">
										{type}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Expandable Search Input */}
					<div
						className={`overflow-hidden transition-all duration-300 ease-in-out ${
							isSearchExpanded
								? "max-h-20 opacity-100 mt-2"
								: "max-h-0 opacity-0"
						}`}
					>
						<div className="px-1">
							<Input
								type="text"
								placeholder="Search by title, description, address..."
								value={searchQuery}
								onChange={(e) => onSearchChange(e.target.value)}
								className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 focus:border-gray-600"
							/>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
