import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const supabase = await createServerSupabaseClient();

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const sixtyDaysAgo = new Date();
		sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

		// Delete read notifications older than 30 days
		const { error: error1, count: count1 } = await supabase
			.from("notifications")
			.delete()
			.eq("is_read", true)
			.lt("created_at", thirtyDaysAgo.toISOString());

		// Delete all notifications older than 60 days (fallback)
		const { error: error2, count: count2 } = await supabase
			.from("notifications")
			.delete()
			.lt("created_at", sixtyDaysAgo.toISOString());

		if (error1 || error2) {
			console.error("Cleanup errors:", { error1, error2 });
			return NextResponse.json(
				{ error: "Failed to cleanup some notifications" },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			deleted_read_30d: count1 || 0,
			deleted_all_60d: count2 || 0,
		});
	} catch (error) {
		console.error("Notification cleanup error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
