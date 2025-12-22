"use client";
export const dynamic = "force-dynamic";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

function CallbackHandler() {
	const router = useRouter();
	const params = useSearchParams();

	useEffect(() => {
		const access_token = params.get("access_token");
		const refresh_token = params.get("refresh_token");
		if (access_token && refresh_token) {
			const supabase = createClient();
			supabase.auth
				.setSession({
					access_token,
					refresh_token,
				})
				.then(() => {
					router.replace("/");
				});
		} else {
			router.replace("/login?error=missing_tokens");
		}
	}, [params, router]);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen">
			<p>Signing you in…</p>
		</div>
	);
}

export default function AuthCallbackPage() {
	return (
		<Suspense>
			<CallbackHandler />
		</Suspense>
	);
}
