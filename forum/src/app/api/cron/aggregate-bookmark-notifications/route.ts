import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const supabase = await createServerSupabaseClient();

		// Get all users with bookmarked posts
		const { data: profiles } = await supabase
			.from("profiles")
			.select("id, bookmarks")
			.not("bookmarks", "is", null);

		if (!profiles) {
			return NextResponse.json({ success: true, processed: 0 });
		}

		let notificationsCreated = 0;

		for (const profile of profiles) {
			const bookmarks = profile.bookmarks || [];
			
			if (bookmarks.length === 0) continue;

			// For each bookmarked post, check for new comments
			for (const issueId of bookmarks) {
				// Get last seen timestamp
				const { data: lastSeen } = await supabase
					.from("last_seen_timestamps")
					.select("last_seen_at")
					.eq("user_id", profile.id)
					.eq("issue_id", issueId)
					.single();

				const lastSeenDate = lastSeen?.last_seen_at || new Date(0).toISOString();

				// Count new comments since last seen
				const { count: newCommentCount } = await supabase
					.from("comments")
					.select("id", { count: "exact", head: true })
					.eq("issue_id", issueId)
					.gt("created_at", lastSeenDate);

				if (newCommentCount && newCommentCount > 0) {
					// Get issue title
					const { data: issue } = await supabase
						.from("issues")
						.select("title")
						.eq("id", issueId)
						.single();

					// Check if notification already exists for today
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					
					const { data: existingNotification } = await supabase
						.from("notifications")
						.select("id, aggregate_count")
						.eq("user_id", profile.id)
						.eq("issue_id", issueId)
						.eq("type", "bookmark_summary")
						.gte("created_at", today.toISOString())
						.single();

					if (existingNotification) {
						// Update existing notification
						await supabase
							.from("notifications")
							.update({
								aggregate_count: newCommentCount,
								is_read: false, // Mark as unread if there are new updates
							})
							.eq("id", existingNotification.id);
					} else {
						// Create new notification
						await supabase
							.from("notifications")
							.insert({
								user_id: profile.id,
								type: "bookmark_summary",
								issue_id: issueId,
								actor_id: null,
								content_preview: issue?.title || null,
								aggregate_count: newCommentCount,
								is_read: false,
							});
						notificationsCreated++;
					}
				}
			}
		}

		return NextResponse.json({
			success: true,
			processed: profiles.length,
			notifications_created: notificationsCreated,
		});
	} catch (error) {
		console.error("Bookmark aggregation error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
