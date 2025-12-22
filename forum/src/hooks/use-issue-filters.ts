
import { useState, useMemo } from "react";
import { Issue, VoteMap, VoteBreakdown } from "@/lib/types/db";
import { GovernmentLevel } from "@/lib/types/geo";
import { getDistrictFieldName } from "@/lib/districts";

export type SortOption = "new" | "popular" | "controversial";

interface UseIssueFiltersProps {
  issues: Issue[];
  votes: VoteMap;
  voteBreakdown: VoteBreakdown;
}

export function useIssueFilters({ issues, votes, voteBreakdown }: UseIssueFiltersProps) {
  // Filter states
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [governmentLevel, setGovernmentLevel] = useState<GovernmentLevel | null>(null);
  const [districtFilter, setDistrictFilter] = useState<string | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("new");

  // Reset district filter when government level changes
  const handleLevelChange = (level: GovernmentLevel | null) => {
    setGovernmentLevel(level);
    setDistrictFilter(null);
  };

  // Calculate controversy score: lower is more controversial (closer to 0 difference)
  const getControversyScore = (issueId: number) => {
    const breakdown = voteBreakdown[issueId];
    if (!breakdown) return Infinity;
    const { upvotes, downvotes } = breakdown;
    return Math.abs(upvotes - downvotes);
  };

  const filteredIssues = useMemo(() => {
    return issues
      .filter((issue) => {
        // Filter by type
        if (typeFilter && issue.type !== typeFilter) return false;

        // Filter by government level (include both district-scoped and broad posts)
        if (governmentLevel) {
          const fieldName = getDistrictFieldName(governmentLevel);
          const matchesLevel = issue.government_level === governmentLevel;
          const hasDistrictScope = Boolean(issue[fieldName]);
          if (!matchesLevel && !hasDistrictScope) return false;
        }

        // Filter by specific district within the selected level
        if (districtFilter && governmentLevel) {
          const fieldName = getDistrictFieldName(governmentLevel);
          if (issue[fieldName] !== districtFilter) return false;
        }

        // Filter by user role
        if (userRoleFilter && issue.user_role !== userRoleFilter) return false;

        // Filter by search query
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
      .sort((a, b) => {
        // Sort by selected method
        if (sortBy === "new") {
          // Sort by creation date, newest first
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        } else if (sortBy === "popular") {
          // Sort by net votes (upvotes - downvotes)
          return (votes[b.id] ?? 0) - (votes[a.id] ?? 0);
        } else if (sortBy === "controversial") {
          // Sort by controversy (lowest score = most controversial)
          return getControversyScore(a.id) - getControversyScore(b.id);
        }
        return 0;
      });
  }, [
    issues,
    typeFilter,
    governmentLevel,
    districtFilter,
    userRoleFilter,
    searchQuery,
    sortBy,
    votes,
    voteBreakdown,
  ]);

  // Extract unique values for options
  const availableTypes = useMemo(
    () => Array.from(new Set(issues.map((i) => i.type).filter(Boolean))).sort(),
    [issues]
  );

  const availableDistricts = useMemo(() => {
    return Array.from(
      new Set(
        issues
          .map((i) => {
            if (!governmentLevel) return i.municipal_district;
            return i[getDistrictFieldName(governmentLevel)];
          })
          .filter((district): district is string => district !== null)
      )
    ).sort();
  }, [issues, governmentLevel]);

  return {
    // State
    typeFilter,
    governmentLevel,
    districtFilter,
    userRoleFilter,
    searchQuery,
    sortBy,
    // Setters
    setTypeFilter,
    setGovernmentLevel: handleLevelChange,
    setDistrictFilter,
    setUserRoleFilter,
    setSearchQuery,
    setSortBy,
    // Results
    filteredIssues,
    // Options
    availableTypes,
    availableDistricts,
  };
}
