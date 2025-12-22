"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/page_components/header";
import { Footer } from "@/components/page_components/footer";
import { DistrictNav } from "@/components/DistrictNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FileText, Users, Target, TrendingUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Petition {
	id: string;
	title: string;
	description: string;
	author: string;
	signatures: number;
	goal: number;
	status: "active" | "delivered" | "closed";
	level: "federal" | "provincial" | "municipal";
	topic: string;
	createdAt: string;
}

const STATUS_STYLES = {
	active: { label: "Collecting Signatures", color: "bg-green-100 text-green-700" },
	delivered: { label: "Delivered", color: "bg-blue-100 text-blue-700" },
	closed: { label: "Closed", color: "bg-gray-100 text-gray-600" },
};

const PLACEHOLDER_PETITIONS: Petition[] = [
	{
		id: "1",
		title: "Improve Cycling Infrastructure Downtown",
		description: "We call on the city council to prioritize protected bike lanes and secure bike parking in the downtown core to promote sustainable transportation.",
		author: "Sarah M.",
		signatures: 1234,
		goal: 2000,
		status: "active",
		level: "municipal",
		topic: "Transit",
		createdAt: "2024-11-15",
	},
	{
		id: "2",
		title: "Extend Library Hours on Weekends",
		description: "Petition to extend public library hours on Saturday and Sunday to better serve working families and students.",
		author: "David K.",
		signatures: 567,
		goal: 1000,
		status: "active",
		level: "municipal",
		topic: "Community Services",
		createdAt: "2024-11-20",
	},
	{
		id: "3",
		title: "Provincial Support for Mental Health Services",
		description: "Calling on the provincial government to increase funding for community mental health services and reduce wait times.",
		author: "Mental Health Alliance",
		signatures: 5000,
		goal: 5000,
		status: "delivered",
		level: "provincial",
		topic: "Healthcare",
		createdAt: "2024-10-01",
	},
];

export default function PetitionsPage() {
	const [loading, setLoading] = useState(true);
	const [petitions, setPetitions] = useState<Petition[]>([]);
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
			setPetitions(PLACEHOLDER_PETITIONS);
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
						<div className="space-y-4">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-40" />
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
								<FileText className="w-5 h-5" />
							</div>
							<div>
								<h1 className="text-2xl font-bold">Petitions</h1>
								<p className="text-sm text-gray-500">
									Sign petitions and make your voice heard on issues that matter
								</p>
							</div>
						</div>
					</div>

					{/* Info Notice */}
					<div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
						<div className="flex items-start gap-3">
							<FileText className="w-5 h-5 text-purple-600 mt-0.5" />
							<div>
								<p className="font-medium text-purple-800">Petitions Feature Coming Soon</p>
								<p className="text-sm text-purple-700 mt-1">
									We&apos;re building a platform for community petitions. Below are examples of the types of petitions you&apos;ll be able to create and sign.
								</p>
							</div>
						</div>
					</div>

					{/* Petitions List */}
					<div className="space-y-4">
						{petitions.map((petition) => {
							const progress = (petition.signatures / petition.goal) * 100;
							return (
								<div
									key={petition.id}
									className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
								>
									<div className="flex items-start justify-between gap-4 mb-3">
										<div className="flex items-center gap-2">
											<Badge className={cn("text-xs", STATUS_STYLES[petition.status].color)}>
												{STATUS_STYLES[petition.status].label}
											</Badge>
											<Badge variant="outline" className="text-xs capitalize">
												{petition.level}
											</Badge>
											<Badge variant="secondary" className="text-xs">
												{petition.topic}
											</Badge>
										</div>
									</div>
									
									<h3 className="font-semibold text-lg mb-2">{petition.title}</h3>
									<p className="text-sm text-gray-600 mb-4">{petition.description}</p>
									
									<div className="mb-4">
										<div className="flex justify-between text-sm mb-1">
											<span className="flex items-center gap-1 text-gray-600">
												<Users className="w-4 h-4" />
												{petition.signatures.toLocaleString()} signatures
											</span>
											<span className="flex items-center gap-1 text-gray-500">
												<Target className="w-4 h-4" />
												Goal: {petition.goal.toLocaleString()}
											</span>
										</div>
										<Progress value={Math.min(progress, 100)} className="h-2" />
										{progress >= 100 && (
											<p className="text-xs text-green-600 mt-1 flex items-center gap-1">
												<TrendingUp className="w-3 h-3" />
												Goal reached!
											</p>
										)}
									</div>
									
									<div className="flex items-center justify-between">
										<p className="text-xs text-gray-500">
											Started by {petition.author} on {new Date(petition.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
										</p>
										<Button 
											variant={petition.status === "active" ? "default" : "outline"} 
											size="sm"
											disabled={petition.status !== "active"}
										>
											{petition.status === "active" ? "Sign Petition" : "View Details"}
										</Button>
									</div>
								</div>
							);
						})}
					</div>

					{/* Start Petition CTA */}
					<div className="mt-6 bg-white rounded-xl border p-6 text-center">
						<FileText className="w-10 h-10 mx-auto text-primary mb-3" />
						<h3 className="font-semibold text-lg mb-2">Start Your Own Petition</h3>
						<p className="text-sm text-gray-600 mb-4">
							Have an issue you care about? Start a petition to gather community support.
						</p>
						<Button disabled>
							Create Petition (Coming Soon)
						</Button>
					</div>
				</main>
			</div>
			<Footer />
		</>
	);
}
