import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const supabase = await createServerSupabaseClient();
		
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		
		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const searchParams = request.nextUrl.searchParams;
		const unreadOnly = searchParams.get("unread_only") === "true";
		const limit = parseInt(searchParams.get("limit") || "20");
		const offset = parseInt(searchParams.get("offset") || "0");

		// Build query
		let query = supabase
			.from("notifications")
			.select(`
				id,
				type,
				issue_id,
				comment_id,
				actor_id,
				content_preview,
				aggregate_count,
				is_read,
				created_at,
				issues!inner(id, title),
				profiles!notifications_actor_id_fkey(id, username, avatar_url)
			`)
			.eq("user_id", user.id)
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (unreadOnly) {
			query = query.eq("is_read", false);
		}

		const { data: notifications, error: fetchError } = await query;

		if (fetchError) {
			console.error("Error fetching notifications:", fetchError);
			return NextResponse.json(
				{ error: "Failed to fetch notifications" },
				{ status: 500 }
			);
		}

		// Get unread count
		const { count: unreadCount } = await supabase
			.from("notifications")
			.select("id", { count: "exact", head: true })
			.eq("user_id", user.id)
			.eq("is_read", false);

		// Transform data to match frontend types
		type NotificationRow = {
			id: string;
			type: string;
			issue_id: string | null;
			comment_id: string | null;
			actor_id: string;
			content_preview: string | null;
			aggregate_count: number | null;
			is_read: boolean;
			created_at: string;
			issues?: { id: string; title: string } | null;
			profiles?: { id: string; username: string | null; avatar_url: string | null } | null;
		};

		const transformedNotifications = (notifications as unknown as NotificationRow[] | null)?.map((n) => ({
			id: n.id,
			user_id: user.id,
			type: n.type,
			issue_id: n.issue_id,
			comment_id: n.comment_id,
			actor_id: n.actor_id,
			content_preview: n.content_preview,
			aggregate_count: n.aggregate_count,
			is_read: n.is_read,
			created_at: n.created_at,
			issue_title: n.issues?.title,
			actor_username: n.profiles?.username,
			actor_avatar_url: n.profiles?.avatar_url,
		})) || [];

		return NextResponse.json({
			notifications: transformedNotifications,
			unread_count: unreadCount || 0,
			has_more: notifications && notifications.length === limit,
		});
	} catch (error) {
		console.error("Notification fetch error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
