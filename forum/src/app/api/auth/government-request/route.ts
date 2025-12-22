import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client
const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { fullName, email, role, position, organization, jurisdiction, message } = body;

		// Validate required fields
		if (!fullName || !email || !role || !position || !organization || !jurisdiction) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		// Store the request in Supabase for tracking
		const { error: insertError } = await supabaseAdmin
			.from("government_requests")
			.insert({
				full_name: fullName,
				email,
				role,
				position,
				organization,
				jurisdiction,
				message: message || null,
				status: "pending",
			});

		// Send email notification to founders
		// Using Resend if available, otherwise just log
		const RESEND_API_KEY = process.env.RESEND_API_KEY;
		const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || "contact@vox.vote";

		if (RESEND_API_KEY) {
			try {
				const emailResponse = await fetch("https://api.resend.com/emails", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${RESEND_API_KEY}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						from: "Vox.Vote <noreply@vox.vote>",
						to: [FOUNDER_EMAIL],
						subject: `[Government Request] ${fullName} - ${position}`,
						html: `
							<h2>New Government Official Request</h2>
							<p>A new government official has requested access to Vox.Vote:</p>
							<table style="border-collapse: collapse; width: 100%; max-width: 600px;">
								<tr>
									<td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name</td>
									<td style="padding: 8px; border: 1px solid #ddd;">${fullName}</td>
								</tr>
								<tr>
									<td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
									<td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
								</tr>
								<tr>
									<td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Role Type</td>
									<td style="padding: 8px; border: 1px solid #ddd;">${role}</td>
								</tr>
								<tr>
									<td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Position</td>
									<td style="padding: 8px; border: 1px solid #ddd;">${position}</td>
								</tr>
								<tr>
									<td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Organization</td>
									<td style="padding: 8px; border: 1px solid #ddd;">${organization}</td>
								</tr>
								<tr>
									<td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Jurisdiction</td>
									<td style="padding: 8px; border: 1px solid #ddd;">${jurisdiction}</td>
								</tr>
								${message ? `
								<tr>
									<td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Message</td>
									<td style="padding: 8px; border: 1px solid #ddd;">${message}</td>
								</tr>
								` : ""}
							</table>
							<p style="margin-top: 20px;">
								<strong>Next steps:</strong> Contact this person to schedule an in-person verification meeting.
							</p>
						`,
					}),
				});

				if (!emailResponse.ok) {
					return NextResponse.json(
						{ error: "Failed to send email" },
						{ status: 500 }
					);
				}
			} catch (emailError) {
				return NextResponse.json(
					{ error: "Failed to send email" },
					{ status: 500 }
				);
			}
		} else if (insertError) {
			return NextResponse.json(
				{ error: "Request could not be processed" },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
