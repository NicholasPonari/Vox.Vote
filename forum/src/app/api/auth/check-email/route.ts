import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
	try {
		const { email } = await request.json();

		if (!email || typeof email !== "string") {
			return NextResponse.json(
				{ error: "Email is required" },
				{ status: 400 }
			);
		}

		const normalizedEmail = email.toLowerCase().trim();

		const supabase = await createServerSupabaseClient();

		// Use Supabase RPC function to check if email exists in auth.users
		const { data, error: rpcError } = await supabase.rpc("check_email_exists", {
			email_to_check: normalizedEmail,
		});

		if (rpcError) {
			console.error("RPC error:", rpcError);
			return NextResponse.json({ exists: false });
		}

		return NextResponse.json({ exists: data });
	} catch (error) {
		console.error("Error checking email:", error);
		return NextResponse.json(
			{ error: "Failed to check email" },
			{ status: 500 }
		);
	}
}
