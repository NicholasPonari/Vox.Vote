import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
	try {
		const supabase = await createServerSupabaseClient();
		
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		
		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { data: settings, error: fetchError } = await supabase
			.from("notification_settings")
			.select("*")
			.eq("user_id", user.id)
			.single();

		if (fetchError) {
			console.error("Error fetching notification settings:", fetchError);
			return NextResponse.json(
				{ error: "Failed to fetch settings" },
				{ status: 500 }
			);
		}

		return NextResponse.json(settings);
	} catch (error) {
		console.error("Settings fetch error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const supabase = await createServerSupabaseClient();
		
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		
		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const { 
			comment_on_post_enabled,
			reply_to_comment_enabled,
			bookmark_summary_enabled 
		} = body;

		type NotificationSettingsUpdates = {
			updated_at: string;
			comment_on_post_enabled?: boolean;
			reply_to_comment_enabled?: boolean;
			bookmark_summary_enabled?: boolean;
		};

		const updates: NotificationSettingsUpdates = {
			updated_at: new Date().toISOString()
		};

		if (typeof comment_on_post_enabled === 'boolean') {
			updates.comment_on_post_enabled = comment_on_post_enabled;
		}
		if (typeof reply_to_comment_enabled === 'boolean') {
			updates.reply_to_comment_enabled = reply_to_comment_enabled;
		}
		if (typeof bookmark_summary_enabled === 'boolean') {
			updates.bookmark_summary_enabled = bookmark_summary_enabled;
		}

		const { error: updateError } = await supabase
			.from("notification_settings")
			.update(updates)
			.eq("user_id", user.id);

		if (updateError) {
			console.error("Error updating notification settings:", updateError);
			return NextResponse.json(
				{ error: "Failed to update settings" },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Settings update error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
