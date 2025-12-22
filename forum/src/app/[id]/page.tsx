"use client";
import { createClient } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CommentThread } from "@/components/CommentThread";
import { Header } from "@/components/page_components/header";
import { DetailedIssue } from "@/lib/types/db";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
	ArrowLeft,
	ArrowBigUp,
	ArrowBigDown,
	MessageCircle,
	Share2,
	User,
	MoreHorizontal,
	Pencil,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { IssueLocationMap } from "@/components/IssueLocationMap";
import { MarkdownContent } from "@/components/MarkdownContent";
import { getTopicLabel } from "@/lib/topics";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { IssueEditForm } from "@/components/IssueEditForm";

async function fetchIssue(id: string): Promise<DetailedIssue | null> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("issues")
		.select(
			`id, title, type, narrative, image_url, created_at, user_id, profiles (id, username, avatar_url), votes (issue_id, value), location_lat, location_lng, address, video_url, media_type, federal_district, municipal_district, provincial_district, topic, government_level`
		)
		.eq("id", id)
		.single();
	if (error) return null;
	// Normalize profiles: if array, take first; else leave as is
	if (data && Array.isArray(data.profiles)) {
		data.profiles = data.profiles;
	}
	return data as DetailedIssue;
}

export default function IssuePage() {
	const params = useParams();
	const [issue, setIssue] = useState<DetailedIssue | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFoundError, setNotFoundError] = useState(false);
	const { user, isMember } = useAuth();
	const router = useRouter();

	// Local vote state and comments count
	const [upvotes, setUpvotes] = useState(0);
	const [downvotes, setDownvotes] = useState(0);
	const [userVote, setUserVote] = useState<1 | -1 | 0>(0);
	const [commentCount, setCommentCount] = useState<number>(0);

	// Edit/Delete state
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Check if current user is the post owner
	const isOwner = user?.id && issue?.user_id === user.id;

	useEffect(() => {
		const loadIssue = async () => {
			if (!params.id || typeof params.id !== "string") {
				setNotFoundError(true);
				setLoading(false);
				return;
			}

			try {
				const fetchedIssue = await fetchIssue(params.id);
				if (!fetchedIssue) {
					setNotFoundError(true);
				} else {
					setIssue(fetchedIssue);
					// initialize vote breakdown
					const ups = (fetchedIssue.votes || []).filter(
						(v) => v.value === 1
					).length;
					const downs = (fetchedIssue.votes || []).filter(
						(v) => v.value === -1
					).length;
					setUpvotes(ups);
					setDownvotes(downs);
				}
			} catch (error) {
				setNotFoundError(true);
			} finally {
				setLoading(false);
			}
		};

		loadIssue();
	}, [params.id]);

	// Fetch comment count and current user vote when issue/user are available
	useEffect(() => {
		const fetchExtras = async () => {
			if (!issue) return;
			const supabase = createClient();
			// comments count
			const { count: cCount } = await supabase
				.from("comments")
				.select("id", { count: "exact", head: true })
				.eq("issue_id", issue.id);
			setCommentCount(cCount || 0);
			// user vote
			if (user?.id) {
				const { data: uv } = await supabase
					.from("votes")
					.select("value")
					.eq("issue_id", issue.id)
					.eq("user_id", user.id)
					.single();
				setUserVote((uv?.value as 1 | -1 | 0) || 0);
			}
		};
		fetchExtras();
	}, [issue, user?.id]);

	// Track visit for notification purposes
	useEffect(() => {
		const trackVisit = async () => {
			if (!issue || !user?.id) return;

			try {
				await fetch("/api/notifications/track-visit", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						issue_id: issue.id,
					}),
				});
			} catch (error) {
				// Silently fail - tracking is not critical
			}
		};

		trackVisit();
	}, [issue?.id, user?.id, issue]);

	if (loading) {
		return (
			<>
				<Header />
				<main className="max-w-3xl mx-auto py-10 px-4">
					<div className="bg-white rounded-lg shadow p-6">
						<div className="animate-pulse">
							<div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
							<div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
							<div className="h-32 bg-gray-200 rounded mb-4"></div>
						</div>
					</div>
				</main>
			</>
		);
	}

	if (notFoundError || !issue) {
		notFound();
		return null;
	}
	// Fix: profiles is array due to Supabase join, extract first profile
	const profile = Array.isArray(issue.profiles)
		? issue.profiles[0]
		: issue.profiles;

	// Derived values
	const netScore = upvotes - downvotes;
	const totalVotes = upvotes + downvotes;

	function formatRelativeTime(ts: string) {
		const now = new Date();
		const then = new Date(ts);
		const diffMs = now.getTime() - then.getTime();
		const minutes = Math.floor(diffMs / (1000 * 60));
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		const weeks = Math.floor(days / 7);
		const months = Math.floor(days / 30);
		const years = Math.floor(days / 365);
		if (years >= 1) return `${years} year${years > 1 ? "s" : ""} ago`;
		if (months >= 1) return `${months} month${months > 1 ? "s" : ""} ago`;
		if (weeks >= 1) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
		if (days >= 1) return `${days} day${days > 1 ? "s" : ""} ago`;
		if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
		return `${Math.max(1, minutes)} min ago`;
	}

	const handleVote = async (value: 1 | -1) => {
		if (!user) {
			toast("You must be logged in to vote.");
			return;
		}
		if (isMember) {
			toast("Members cannot vote. Become a verified resident to vote.");
			return;
		}
		if (userVote === value) return; // no-op if re-clicking same
		const supabase = createClient();
		const { error } = await supabase
			.from("votes")
			.upsert(
				{ issue_id: issue.id, user_id: user.id, value },
				{ onConflict: "user_id,issue_id" }
			);
		if (error) {
			toast("Could not submit vote.");
			return;
		}
		// refresh counts and user vote
		const [{ data: voteData }, { data: userVoteData }] = await Promise.all([
			supabase.from("votes").select("value").eq("issue_id", issue.id),
			supabase
				.from("votes")
				.select("value")
				.eq("issue_id", issue.id)
				.eq("user_id", user.id)
				.single(),
		]);
		if (voteData) {
			setUpvotes(voteData.filter((v) => v.value === 1).length);
			setDownvotes(voteData.filter((v) => v.value === -1).length);
		}
		setUserVote((userVoteData?.value as 1 | -1 | 0) || 0);
	};

	const handleShare = async () => {
		const url = typeof window !== "undefined" ? window.location.href : "";
		try {
			if (navigator.share) {
				await navigator.share({
					title: issue.title,
					text: issue.narrative,
					url,
				});
			} else {
				await navigator.clipboard.writeText(url);
				toast("Link copied to clipboard");
			}
		} catch {
			// ignore cancel/error
		}
	};

	const handleDelete = async () => {
		if (!user || !issue) return;
		setIsDeleting(true);
		const supabase = createClient();

		// Delete the issue
		const { error: deleteError } = await supabase
			.from("issues")
			.delete()
			.eq("id", issue.id)
			.eq("user_id", user.id);

		if (deleteError) {
			toast.error("Failed to delete post");
			setIsDeleting(false);
			return;
		}

		// Subtract 100 points for deleting a post
		const { error: scoreError } = await supabase.rpc("increment_score", {
			user_id: user.id,
			points: -100,
		});

		if (scoreError) {
			console.error("Failed to update user score:", scoreError);
		}

		setIsDeleting(false);
		setIsDeleteDialogOpen(false);
		toast.success("Post deleted successfully");
		router.push("/");
	};

	const handleEditSuccess = () => {
		setIsEditDialogOpen(false);
		// Reload the issue data
		window.location.reload();
	};

	return (
		<>
			<Header />
			<main className="max-w-3xl mx-auto px-4 mb-32">
				{/* Back button */}
				<div className="mb-4">
					<Button
						variant="ghost"
						className="flex items-center gap-2 px-2"
						onClick={() => router.back()}
					>
						<ArrowLeft className="w-5 h-5" />
						Back
					</Button>
				</div>

				{/* Issue Details Section */}
				<section className="mb-8">
					<div className="bg-white rounded-lg shadow p-6">
						{/* Header: avatar, username, time */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3 text-sm text-gray-600">
								<Link
									href={`/profile/${issue.user_id}`}
									onClick={(e) => e.stopPropagation()}
								>
									<Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all">
										<AvatarImage
											src={profile?.avatar_url ?? undefined}
											alt={profile?.username ?? "User"}
										/>
										<AvatarFallback className="bg-gray-200">
											<User className="w-4 h-4 text-gray-500" />
										</AvatarFallback>
									</Avatar>
								</Link>
								<Link
									href={`/profile/${issue.user_id}`}
									onClick={(e) => e.stopPropagation()}
									className="font-medium text-gray-700 hover:text-orange-500 hover:underline transition-all"
								>
									{profile?.username ?? "Unknown"}
								</Link>
								<span className="text-gray-400">•</span>
								<div className="text-gray-500">
									{formatRelativeTime(issue.created_at)}
								</div>
								{issue.topic && (
									<>
										<span className="text-gray-400">•</span>
										<Link
											href={`/issues/${issue.topic}`}
											className="font-medium text-primary/80 hover:text-primary hover:underline transition-all"
										>
											{getTopicLabel(issue.topic)}
										</Link>
									</>
								)}
							</div>

							{/* Three-dot menu for post owner */}
							{isOwner && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="h-8 w-8">
											<MoreHorizontal className="h-4 w-4" />
											<span className="sr-only">Open menu</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
											<Pencil className="mr-2 h-4 w-4" />
											Edit
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setIsDeleteDialogOpen(true)}
											className="text-destructive focus:text-destructive"
										>
											<Trash2 className="mr-2 h-4 w-4" />
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>

						{/* Title */}
						<h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900">
							{issue.title}
						</h1>

						{/* Description */}
						{issue.narrative && (
							<div className="mt-3">
								<MarkdownContent content={issue.narrative} />
							</div>
						)}

						{/* Media - show after text, like Reddit inline media */}
						{issue.media_type === "video" && issue.video_url ? (
							<div className="w-full flex justify-center mt-4">
								<VideoPlayer
									src={issue.video_url}
									width={640}
									height={480}
									className="rounded-xl border w-full max-h-[28rem]"
									style={{ maxWidth: 640 }}
									poster={`https://image.mux.com/${
										issue.video_url.split("/")[3].split(".")[0]
									}/thumbnail.jpg?width=640&height=480&fit_mode=crop`}
								/>
							</div>
						) : issue.image_url ? (
							<div className="w-full flex justify-center mt-4">
								<Image
									width={640}
									height={480}
									src={issue.image_url}
									alt={issue.title}
									className="rounded-xl object-cover border w-full max-h-[28rem]"
									style={{ maxWidth: 640 }}
								/>
							</div>
						) : null}

						<IssueLocationMap
							latitude={issue.location_lat}
							longitude={issue.location_lng}
						/>

						{/* Action bar */}
						<div className="mt-5 flex items-center gap-4 text-sm">
							<div className="flex items-center rounded-full bg-gray-50 border px-2 py-1">
								<button
									onClick={() => handleVote(1)}
									disabled={!user}
									className={`p-1 rounded hover:bg-green-100 ${
										userVote === 1 ? "text-green-600" : "text-gray-500"
									}`}
									aria-label="Upvote"
								>
									<ArrowBigUp className="w-5 h-5" />
								</button>
								<div className="mx-2 min-w-[2ch] text-center font-semibold">
									{netScore}
								</div>
								<button
									onClick={() => handleVote(-1)}
									disabled={!user}
									className={`p-1 rounded hover:bg-red-100 ${
										userVote === -1 ? "text-red-600" : "text-gray-500"
									}`}
									aria-label="Downvote"
								>
									<ArrowBigDown className="w-5 h-5" />
								</button>
							</div>
							<div className="text-gray-500">
								{totalVotes} total vote{totalVotes === 1 ? "" : "s"}
							</div>
							<div className="flex items-center gap-1 text-gray-600">
								<MessageCircle className="w-4 h-4" />
								<span>{commentCount}</span>
								<span>comment{commentCount === 1 ? "" : "s"}</span>
							</div>
							<button
								onClick={handleShare}
								className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
							>
								<Share2 className="w-4 h-4" />
								Share
							</button>
						</div>
					</div>
				</section>

				<section>
					<div className="bg-gray-50 rounded-lg shadow p-1">
						<CommentThread issueId={issue.id} user_id={user?.id} />
					</div>
				</section>
			</main>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Post</DialogTitle>
					</DialogHeader>
					<IssueEditForm issue={issue} onSuccess={handleEditSuccess} />
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Post</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this post? This action cannot be
							undone. You will lose 100 points for deleting your post.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
