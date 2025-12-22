import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

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

		const { count } = await supabase
			.from("notifications")
			.select("id", { count: "exact", head: true })
			.eq("user_id", user.id)
			.eq("is_read", false);

		return NextResponse.json({ count: count || 0 });
	} catch (error) {
		console.error("Unread count error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
