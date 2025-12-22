import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const supabase = await createServerSupabaseClient();
		
		// Get the authenticated user
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		
		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { issueId, action } = await request.json();

		if (!issueId || !action) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		// Get current bookmarked posts
		const { data: profile, error: fetchError } = await supabase
			.from("profiles")
			.select("bookmarks")
			.eq("id", user.id)
			.single();

		if (fetchError) {
			return NextResponse.json(
				{ error: "Failed to fetch profile" },
				{ status: 500 }
			);
		}

		let bookmarkedPosts: string[] = profile?.bookmarks || [];

		// Add or remove bookmark
		if (action === "add") {
			if (!bookmarkedPosts.includes(issueId.toString())) {
				bookmarkedPosts.push(issueId.toString());
			}
		} else if (action === "remove") {
			bookmarkedPosts = bookmarkedPosts.filter(
				(id) => id !== issueId.toString()
			);
		} else {
			return NextResponse.json(
				{ error: "Invalid action" },
				{ status: 400 }
			);
		}

		// Update the profile
		const { error: updateError } = await supabase
			.from("profiles")
			.update({ bookmarks: bookmarkedPosts })
			.eq("id", user.id);

		if (updateError) {
			return NextResponse.json(
				{ error: "Failed to update bookmarks" },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			bookmarkedPosts,
		});
	} catch (error) {
		console.error("Bookmark error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
