"use client";

import { IssueCard } from "../IssueCard";
import {
	VoteMap,
	CommentsCountMap,
	Issue,
	VoteBreakdown,
} from "@/lib/types/db";
import {
	ProfileLocation,
	MapDistrictData,
	UserDistrictInfo,
} from "@/lib/types/geo";
import { useLogoTransition } from "@/hooks/use-logo-transition";
import { useIssueFilters } from "@/hooks/use-issue-filters";
import { IssuesHero } from "@/components/issues/IssuesHero";
import { FilterBar } from "@/components/issues/FilterBar";

interface IssuesProps {
	issues: Issue[];
	votes: VoteMap;
	voteBreakdown: VoteBreakdown;
	commentsCount: CommentsCountMap;
	headerLogoRef?: React.RefObject<HTMLDivElement | null>;
	userDistricts?: UserDistrictInfo | null;
	mapDistricts?: MapDistrictData | null;
	profileLocation?: ProfileLocation | null;
}

export default function Issues({
	issues,
	votes,
	voteBreakdown,
	commentsCount,
	headerLogoRef,
}: IssuesProps) {
	// Custom hook for filtering and sorting logic
	const {
		// State
		typeFilter,
		governmentLevel,
		districtFilter,
		userRoleFilter,
		searchQuery,
		sortBy,
		// Setters
		setTypeFilter,
		setGovernmentLevel,
		setDistrictFilter,
		setUserRoleFilter,
		setSearchQuery,
		setSortBy,
		// Results
		filteredIssues,
		// Options
		availableTypes,
		availableDistricts,
	} = useIssueFilters({ issues, votes, voteBreakdown });

	// Logo transition logic
	const { startLogoRef, motionStyle } = useLogoTransition(headerLogoRef);

	return (
		<section className="max-w-5xl mx-auto py-10 px-4">
			<IssuesHero startLogoRef={startLogoRef} motionStyle={motionStyle} />

			<FilterBar
				governmentLevel={governmentLevel}
				searchQuery={searchQuery}
				sortBy={sortBy}
				districtFilter={districtFilter}
				typeFilter={typeFilter}
				userRoleFilter={userRoleFilter}
				availableTypes={availableTypes}
				availableDistricts={availableDistricts}
				onLevelChange={setGovernmentLevel}
				onSearchChange={setSearchQuery}
				onSortChange={setSortBy}
				onDistrictChange={setDistrictFilter}
				onTypeChange={setTypeFilter}
				onUserRoleChange={setUserRoleFilter}
			/>

			<div className="space-y-1 mt-3 mx-0">
				{filteredIssues.map((issue) => (
					<IssueCard
						key={issue.id}
						issue={issue}
						votes={votes}
						voteBreakdown={voteBreakdown}
						commentsCount={commentsCount[issue.id] ?? 0}
					/>
				))}
			</div>
		</section>
	);
}
