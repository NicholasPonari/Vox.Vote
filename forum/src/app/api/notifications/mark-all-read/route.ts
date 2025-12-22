import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function PATCH() {
	try {
		const supabase = await createServerSupabaseClient();
		
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		
		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { error: updateError, count } = await supabase
			.from("notifications")
			.update({ is_read: true })
			.eq("user_id", user.id)
			.eq("is_read", false);

		if (updateError) {
			console.error("Error marking all notifications as read:", updateError);
			return NextResponse.json(
				{ error: "Failed to update notifications" },
				{ status: 500 }
			);
		}

		return NextResponse.json({ 
			success: true,
			updated_count: count || 0
		});
	} catch (error) {
		console.error("Mark all read error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
