import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const supabase = await createServerSupabaseClient();
		
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		
		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { issue_id } = await request.json();

		if (!issue_id) {
			return NextResponse.json(
				{ error: "Missing issue_id" },
				{ status: 400 }
			);
		}

		// Upsert the last seen timestamp
		const { error: upsertError } = await supabase
			.from("last_seen_timestamps")
			.upsert(
				{
					user_id: user.id,
					issue_id: issue_id,
					last_seen_at: new Date().toISOString(),
				},
				{
					onConflict: "user_id,issue_id"
				}
			);

		if (upsertError) {
			console.error("Error tracking visit:", upsertError);
			return NextResponse.json(
				{ error: "Failed to track visit" },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Track visit error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
