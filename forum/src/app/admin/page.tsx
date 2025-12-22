"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
	const { user } = useAuth();
	const router = useRouter();
	const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const checkAdminAccess = async () => {
			if (!user?.id) {
				// Not logged in, redirect to home
				router.push("/");
				return;
			}

			const supabase = createClient();
			const { data, error } = await supabase
				.from("profiles")
				.select("type")
				.eq("id", user.id)
				.single();

			if (error || data?.type !== "Admin") {
				setIsAdmin(false);
				setLoading(false);
				return;
			}

			setIsAdmin(true);
			setLoading(false);
		};

		checkAdminAccess();
	}, [user?.id, router]);

	// Loading state
	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-white to-gray-100 flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	// Not authorized
	if (!isAdmin) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-white to-gray-100">
				<header className="sticky top-0 z-50 w-full bg-white shadow-sm">
					<div className="container mx-auto flex items-center justify-between h-16 px-4">
						<Link href="/" className="flex items-center gap-2">
							<Image
								src="/vox-vote-logo.png"
								alt="vox-vote-logo"
								width={80}
								height={32}
							/>
						</Link>
					</div>
				</header>
				<main className="container mx-auto px-4 py-12">
					<div className="max-w-md mx-auto text-center space-y-6">
						<div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
							<Shield className="w-10 h-10 text-red-600" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
						<p className="text-lg text-gray-600">
							You do not have permission to access the admin panel.
						</p>
						<Button asChild size="lg" className="mt-8">
							<Link href="/">Return to Home</Link>
						</Button>
					</div>
				</main>
			</div>
		);
	}

	// Admin Panel
	return (
		<div className="min-h-screen bg-gradient-to-b from-white to-gray-100">
			{/* Header */}
			<header className="sticky top-0 z-50 w-full bg-white shadow-sm">
				<div className="container mx-auto flex items-center justify-between h-16 px-4">
					<Link href="/" className="flex items-center gap-2">
						<Image
							src="/vox-vote-logo.png"
							alt="vox-vote-logo"
							width={80}
							height={32}
						/>
					</Link>
					<div className="flex items-center gap-2">
						<Shield className="w-5 h-5 text-red-600" />
						<span className="font-semibold text-gray-900">Admin Panel</span>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
						<Shield className="w-8 h-8 text-red-600" />
						Admin Dashboard
					</h1>
					<p className="text-gray-600 mt-2">
						Manage users, content, and platform settings.
					</p>
				</div>

				{/* Admin sections - placeholder cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{/* User Management */}
					<div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							User Management
						</h2>
						<p className="text-gray-600 text-sm mb-4">
							View and manage user accounts, verify residents, and handle
							government official requests.
						</p>
						<Button variant="outline" className="w-full" disabled>
							Coming Soon
						</Button>
					</div>

					{/* Content Moderation */}
					<div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Content Moderation
						</h2>
						<p className="text-gray-600 text-sm mb-4">
							Review flagged posts, manage comments, and moderate community
							content.
						</p>
						<Button variant="outline" className="w-full" disabled>
							Coming Soon
						</Button>
					</div>

					{/* Government Requests */}
					<div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Government Requests
						</h2>
						<p className="text-gray-600 text-sm mb-4">
							Review and process pending government official account requests.
						</p>
						<Button variant="outline" className="w-full" disabled>
							Coming Soon
						</Button>
					</div>

					{/* Analytics */}
					<div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Platform Analytics
						</h2>
						<p className="text-gray-600 text-sm mb-4">
							View user engagement, voting trends, and platform statistics.
						</p>
						<Button variant="outline" className="w-full" disabled>
							Coming Soon
						</Button>
					</div>

					{/* Settings */}
					<div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Platform Settings
						</h2>
						<p className="text-gray-600 text-sm mb-4">
							Configure platform settings, feature flags, and system
							preferences.
						</p>
						<Button variant="outline" className="w-full" disabled>
							Coming Soon
						</Button>
					</div>

					{/* Audit Logs */}
					<div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Audit Logs
						</h2>
						<p className="text-gray-600 text-sm mb-4">
							View system activity, admin actions, and security events.
						</p>
						<Button variant="outline" className="w-full" disabled>
							Coming Soon
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
