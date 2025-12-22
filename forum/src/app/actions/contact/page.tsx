"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/page_components/header";
import { Footer } from "@/components/page_components/footer";
import { DistrictNav } from "@/components/DistrictNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MapPin, ExternalLink, Building2, Landmark, MapPinned, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Representative {
	id: string;
	name: string;
	role: string;
	party?: string;
	level: "federal" | "provincial" | "municipal";
	district: string;
	email?: string;
	phone?: string;
	office?: string;
	website?: string;
	imageUrl?: string;
}

const LEVEL_ICONS = {
	federal: Building2,
	provincial: Landmark,
	municipal: MapPinned,
};

const LEVEL_COLORS = {
	federal: "bg-blue-100 text-blue-700",
	provincial: "bg-purple-100 text-purple-700",
	municipal: "bg-green-100 text-green-700",
};

const PLACEHOLDER_REPS: Representative[] = [
	{
		id: "1",
		name: "Jane Smith",
		role: "Member of Parliament",
		party: "Liberal",
		level: "federal",
		district: "Toronto Centre",
		email: "jane.smith@parl.gc.ca",
		phone: "(613) 555-0123",
		office: "House of Commons, Ottawa, ON",
		website: "https://example.com",
	},
	{
		id: "2",
		name: "John Doe",
		role: "Member of Provincial Parliament",
		party: "Progressive Conservative",
		level: "provincial",
		district: "Toronto Centre",
		email: "john.doe@ola.org",
		phone: "(416) 555-0456",
		office: "Queen's Park, Toronto, ON",
	},
	{
		id: "3",
		name: "Maria Garcia",
		role: "City Councillor",
		level: "municipal",
		district: "Ward 13 - Toronto Centre",
		email: "councillor_garcia@toronto.ca",
		phone: "(416) 555-0789",
		office: "City Hall, Toronto, ON",
	},
];

export default function ContactRepPage() {
	const [loading, setLoading] = useState(true);
	const [representatives, setRepresentatives] = useState<Representative[]>([]);
	const [scrollProgress, setScrollProgress] = useState(0);
	const headerLogoRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleScroll = () => {
			const scrollY = window.scrollY;
			const progress = Math.min(Math.max(scrollY / 100, 0), 1);
			setScrollProgress(progress);
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	useEffect(() => {
		setTimeout(() => {
			setRepresentatives(PLACEHOLDER_REPS);
			setLoading(false);
		}, 500);
	}, []);

	if (loading) {
		return (
			<>
				<Header logoRef={headerLogoRef} logoOpacity={scrollProgress} />
				<div className="flex min-h-screen">
					<aside className="hidden lg:block w-64 border-r bg-white shrink-0">
						<Skeleton className="h-full" />
					</aside>
					<main className="flex-1 p-6">
						<Skeleton className="h-12 w-64 mb-6" />
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-64" />
							))}
						</div>
					</main>
				</div>
			</>
		);
	}

	return (
		<>
			<Header logoRef={headerLogoRef} logoOpacity={scrollProgress} />
			<div className="flex min-h-screen bg-gray-50">
				<aside className="hidden lg:block w-64 border-r bg-white shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
					<DistrictNav />
				</aside>

				<main className="flex-1 max-w-4xl mx-auto py-6 px-4">
					<div className="mb-6">
						<Link
							href="/"
							className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
						>
							<ArrowLeft className="w-4 h-4" />
							Back to home
						</Link>
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
								<Mail className="w-5 h-5" />
							</div>
							<div>
								<h1 className="text-2xl font-bold">Contact Your Representatives</h1>
								<p className="text-sm text-gray-500">
									Find and reach out to your elected officials at all levels of government
								</p>
							</div>
						</div>
					</div>

					{/* Info Notice */}
					<div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
						<div className="flex items-start gap-3">
							<Mail className="w-5 h-5 text-green-600 mt-0.5" />
							<div>
								<p className="font-medium text-green-800">Representative Lookup Coming Soon</p>
								<p className="text-sm text-green-700 mt-1">
									We&apos;re integrating with official databases to show your actual representatives based on your location. Below are example contacts.
								</p>
							</div>
						</div>
					</div>

					{/* Set Location Prompt */}
					<div className="bg-white rounded-xl border p-4 mb-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Find Your Representatives</p>
								<p className="text-sm text-gray-500">Set your location to see who represents you</p>
							</div>
							<Button variant="outline" size="sm" asChild>
								<Link href="/profile">
									<MapPin className="w-4 h-4 mr-1" />
									Set Location
								</Link>
							</Button>
						</div>
					</div>

					{/* Representatives Grid */}
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{representatives.map((rep) => {
							const LevelIcon = LEVEL_ICONS[rep.level];
							return (
								<Card key={rep.id} className="hover:shadow-md transition-shadow">
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<Badge className={cn("text-xs capitalize", LEVEL_COLORS[rep.level])}>
												<LevelIcon className="w-3 h-3 mr-1" />
												{rep.level}
											</Badge>
											{rep.party && (
												<Badge variant="outline" className="text-xs">
													{rep.party}
												</Badge>
											)}
										</div>
										<div className="flex items-center gap-3 mt-3">
											<div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
												<User className="w-6 h-6 text-gray-400" />
											</div>
											<div>
												<CardTitle className="text-lg">{rep.name}</CardTitle>
												<CardDescription>{rep.role}</CardDescription>
											</div>
										</div>
									</CardHeader>
									<CardContent className="space-y-3">
										<p className="text-sm text-gray-600 flex items-center gap-2">
											<MapPin className="w-4 h-4 text-gray-400" />
											{rep.district}
										</p>
										
										{rep.email && (
											<a 
												href={`mailto:${rep.email}`}
												className="text-sm text-primary hover:underline flex items-center gap-2"
											>
												<Mail className="w-4 h-4" />
												{rep.email}
											</a>
										)}
										
										{rep.phone && (
											<a 
												href={`tel:${rep.phone}`}
												className="text-sm text-gray-600 hover:text-primary flex items-center gap-2"
											>
												<Phone className="w-4 h-4" />
												{rep.phone}
											</a>
										)}
										
										<div className="pt-3 flex gap-2">
											<Button size="sm" className="flex-1" asChild>
												<a href={`mailto:${rep.email}`}>
													<Mail className="w-4 h-4 mr-1" />
													Email
												</a>
											</Button>
											{rep.website && (
												<Button size="sm" variant="outline" asChild>
													<a href={rep.website} target="_blank" rel="noopener noreferrer">
														<ExternalLink className="w-4 h-4" />
													</a>
												</Button>
											)}
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>

					{representatives.length === 0 && (
						<div className="text-center py-12 bg-white rounded-xl border">
							<Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
							<p className="text-gray-500 mb-2">No representatives found</p>
							<p className="text-sm text-gray-400">
								Set your location to find your elected officials
							</p>
						</div>
					)}
				</main>
			</div>
			<Footer />
		</>
	);
}
