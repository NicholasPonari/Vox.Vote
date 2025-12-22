import { SupabaseClient } from "@supabase/supabase-js";

interface CreateNotificationParams {
	supabase: SupabaseClient;
	userId: string;
	type: 'comment_on_post' | 'reply_to_comment' | 'bookmark_summary';
	issueId: string;
	commentId?: string;
	actorId: string;
	contentPreview?: string;
	aggregateCount?: number;
}

export async function createNotification(params: CreateNotificationParams) {
	const {
		supabase,
		userId,
		type,
		issueId,
		commentId,
		actorId,
		contentPreview,
		aggregateCount = 1,
	} = params;

	// Don't notify users about their own actions
	if (userId === actorId) {
		return { success: true, skipped: true };
	}

	// Check if user has this notification type enabled
	const { data: settings } = await supabase
		.from("notification_settings")
		.select("*")
		.eq("user_id", userId)
		.single();

	if (settings) {
		if (type === 'comment_on_post' && !settings.comment_on_post_enabled) {
			return { success: true, skipped: true };
		}
		if (type === 'reply_to_comment' && !settings.reply_to_comment_enabled) {
			return { success: true, skipped: true };
		}
		if (type === 'bookmark_summary' && !settings.bookmark_summary_enabled) {
			return { success: true, skipped: true };
		}
	}

	// Create the notification
	const { error } = await supabase
		.from("notifications")
		.insert({
			user_id: userId,
			type,
			issue_id: issueId,
			comment_id: commentId || null,
			actor_id: actorId,
			content_preview: contentPreview || null,
			aggregate_count: aggregateCount,
			is_read: false,
		});

	if (error) {
		console.error("Error creating notification:", error);
		return { success: false, error };
	}

	return { success: true, skipped: false };
}

export async function createNotificationsForComment(
	supabase: SupabaseClient,
	commentId: string,
	issueId: string,
	parentId: string | null,
	userId: string,
	content: string
) {
	// Get issue details to find the post owner
	const { data: issue } = await supabase
		.from("issues")
		.select("user_id, title")
		.eq("id", issueId)
		.single();

	if (!issue) {
		return;
	}

	const contentPreview = content.substring(0, 100);

	// 1. If it's a top-level comment, notify the post owner
	if (!parentId && issue.user_id && issue.user_id !== userId) {
		await createNotification({
			supabase,
			userId: issue.user_id,
			type: 'comment_on_post',
			issueId,
			commentId,
			actorId: userId,
			contentPreview,
		});
	}

	// 2. If it's a reply, notify the parent comment owner
	if (parentId) {
		const { data: parentComment } = await supabase
			.from("comments")
			.select("user_id")
			.eq("id", parentId)
			.single();

		if (parentComment?.user_id && parentComment.user_id !== userId) {
			await createNotification({
				supabase,
				userId: parentComment.user_id,
				type: 'reply_to_comment',
				issueId,
				commentId,
				actorId: userId,
				contentPreview,
			});
		}
	}
}
