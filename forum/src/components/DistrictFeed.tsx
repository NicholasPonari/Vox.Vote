"use client";

import { useState, useRef, useEffect } from "react";
import { IssueCard } from "./IssueCard";
import { Input } from "./ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import {
	VoteMap,
	CommentsCountMap,
	VoteBreakdown,
	Issue,
} from "@/lib/types/db";
import { Search } from "lucide-react";

interface DistrictFeedProps {
	issues: Issue[];
	votes: VoteMap;
	voteBreakdown: VoteBreakdown;
	commentsCount: CommentsCountMap;
}

export function DistrictFeed({
	issues,
	votes,
	voteBreakdown,
	commentsCount,
}: DistrictFeedProps) {
	const [typeFilter, setTypeFilter] = useState<string | null>(null);
	const [userRoleFilter, setUserRoleFilter] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
	const [sortBy, setSortBy] = useState<string>("popular");
	const [isFilterSticky, setIsFilterSticky] = useState(false);
	const filterBarRef = useRef<HTMLDivElement>(null);
	const filterPlaceholderRef = useRef<HTMLDivElement>(null);

	// Calculate controversy score
	const getControversyScore = (issueId: number) => {
		const breakdown = voteBreakdown[issueId];
		if (!breakdown) return Infinity;
		const { upvotes, downvotes } = breakdown;
		return Math.abs(upvotes - downvotes);
	};

	const filtered = issues
		.filter((issue) => {
			if (typeFilter && issue.type !== typeFilter) return false;
			if (userRoleFilter && issue.user_role !== userRoleFilter) return false;

			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				return (
					issue.address?.toLowerCase().includes(query) ||
					issue.narrative?.toLowerCase().includes(query) ||
					issue.title?.toLowerCase().includes(query) ||
					(issue.username && issue.username?.toLowerCase().includes(query))
				);
			}

			return true;
		})
		.slice()
		.sort((a, b) => {
			if (sortBy === "new") {
				return (
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			} else if (sortBy === "popular") {
				return (votes[b.id] ?? 0) - (votes[a.id] ?? 0);
			} else if (sortBy === "controversial") {
				return getControversyScore(a.id) - getControversyScore(b.id);
			}
			return 0;
		});

	const types = Array.from(new Set(issues.map((i) => i.type).filter(Boolean)));
	const userRoles = ["Resident", "Politician", "Candidate"];

	// Track filter bar sticky behavior
	useEffect(() => {
		const handleScroll = () => {
			if (!filterBarRef.current) return;

			const filterBarTop =
				filterPlaceholderRef.current?.getBoundingClientRect().top || 0;
			const headerHeight = 64;

			if (filterBarTop <= headerHeight) {
				setIsFilterSticky(true);
			} else {
				setIsFilterSticky(false);
			}
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div>
			{/* Desktop: Search Bar */}
			<div className="relative mb-4 hidden md:block">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
				<Input
					type="text"
					placeholder="Search posts..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-10 rounded-xl bg-white"
				/>
			</div>

			{/* Desktop: Filter Controls */}
			<div className="hidden md:flex flex-wrap gap-3 mb-4">
				<Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
					<SelectTrigger className="w-[140px] rounded-xl bg-white">
						<SelectValue placeholder="Sort By" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="new">New</SelectItem>
						<SelectItem value="popular">Popular</SelectItem>
						<SelectItem value="controversial">Controversial</SelectItem>
					</SelectContent>
				</Select>

				<Select
					value={typeFilter || "all"}
					onValueChange={(value) =>
						setTypeFilter(value === "all" ? null : value)
					}
				>
					<SelectTrigger className="w-[140px] rounded-xl bg-white">
						<SelectValue placeholder="Type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Types</SelectItem>
						{types.map((type) => (
							<SelectItem key={type} value={type} className="capitalize">
								{type}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={userRoleFilter || "all"}
					onValueChange={(value) =>
						setUserRoleFilter(value === "all" ? null : value)
					}
				>
					<SelectTrigger className="w-[140px] rounded-xl bg-white">
						<SelectValue placeholder="User Role" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Users</SelectItem>
						{userRoles.map((role) => (
							<SelectItem key={role} value={role}>
								{role}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Mobile: Compact Filter Bar */}
			<div
				ref={filterPlaceholderRef}
				className="md:hidden mb-4"
				style={
					isFilterSticky
						? { height: filterBarRef.current?.offsetHeight || "auto" }
						: {}
				}
			>
				<div
					ref={filterBarRef}
					className={`bg-black text-white overflow-hidden transition-all duration-200 ${
						isFilterSticky
							? "fixed top-16 left-0 right-0 z-40 rounded-none shadow-lg"
							: "rounded-xl"
					}`}
					style={isFilterSticky ? { maxWidth: "100vw" } : {}}
				>
					<div className="flex items-center ml-2 mt-1 gap-2">
						<button
							onClick={() => setIsSearchExpanded(!isSearchExpanded)}
							className="flex-shrink-0 p-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-all shadow-sm"
							aria-label="Toggle search"
						>
							<Search className="w-5 h-5 text-gray-300" />
						</button>

						<Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
							<SelectTrigger className="border-0 bg-transparent text-xs font-medium text-white hover:bg-gray-800 h-auto py-2 px-1 flex-shrink-0 gap-1 [&>svg]:text-gray-400 [&>svg]:opacity-100">
								<SelectValue placeholder="Sort" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="new">New</SelectItem>
								<SelectItem value="popular">Popular</SelectItem>
								<SelectItem value="controversial">Controversial</SelectItem>
							</SelectContent>
						</Select>

						<Select
							value={typeFilter || "all"}
							onValueChange={(value) =>
								setTypeFilter(value === "all" ? null : value)
							}
						>
							<SelectTrigger className="border-0 bg-transparent text-xs font-medium text-white hover:bg-gray-800 h-auto py-2 px-1 flex-shrink-0 gap-1 [&>svg]:text-gray-400 [&>svg]:opacity-100">
								<SelectValue placeholder="Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								{types.map((type) => (
									<SelectItem key={type} value={type} className="capitalize">
										{type}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={userRoleFilter || "all"}
							onValueChange={(value) =>
								setUserRoleFilter(value === "all" ? null : value)
							}
						>
							<SelectTrigger className="border-0 bg-transparent text-xs font-medium text-white hover:bg-gray-800 h-auto py-2 px-1 flex-shrink-0 gap-1 [&>svg]:text-gray-400 [&>svg]:opacity-100">
								<SelectValue placeholder="Users" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Users</SelectItem>
								{userRoles.map((role) => (
									<SelectItem key={role} value={role}>
										{role}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div
						className={`overflow-hidden mt-1 mb-3 transition-all duration-300 ease-in-out ${
							isSearchExpanded ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
						}`}
					>
						<div className="px-3 pb-3">
							<Input
								type="text"
								placeholder="Search posts..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 focus:border-gray-600"
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Issue Cards */}
			<div className="space-y-1">
				{filtered.map((issue) => (
					<IssueCard
						key={issue.id}
						issue={issue}
						votes={votes}
						voteBreakdown={voteBreakdown}
						commentsCount={commentsCount[issue.id] ?? 0}
					/>
				))}
			</div>
		</div>
	);
}
