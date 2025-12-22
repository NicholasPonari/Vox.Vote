"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/page_components/header";
import { Footer } from "@/components/page_components/footer";
import { DistrictNav } from "@/components/DistrictNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, MessageSquare, Calendar, Users, ExternalLink, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Consultation {
	id: string;
	title: string;
	description: string;
	department: string;
	startDate: string;
	endDate: string;
	participantCount: number;
	status: "active" | "upcoming" | "closed";
	level: "federal" | "provincial" | "municipal";
	link?: string;
}

const STATUS_STYLES = {
	active: { label: "Open for Input", color: "bg-green-100 text-green-700" },
	upcoming: { label: "Coming Soon", color: "bg-blue-100 text-blue-700" },
	closed: { label: "Closed", color: "bg-gray-100 text-gray-600" },
};

const PLACEHOLDER_CONSULTATIONS: Consultation[] = [
	{
		id: "1",
		title: "Downtown Revitalization Plan",
		description: "Share your vision for the future of our downtown core. We want to hear about pedestrian access, green spaces, and local business support.",
		department: "Urban Planning",
		startDate: "2024-12-01",
		endDate: "2024-12-31",
		participantCount: 234,
		status: "active",
		level: "municipal",
	},
	{
		id: "2",
		title: "Public Transit Improvements Survey",
		description: "Help us prioritize transit improvements. Your feedback will shape bus route changes and new rapid transit planning.",
		department: "Transportation",
		startDate: "2024-12-10",
		endDate: "2025-01-15",
		participantCount: 567,
		status: "active",
		level: "municipal",
	},
	{
		id: "3",
		title: "Provincial Healthcare Access Review",
		description: "The Ministry of Health is seeking input on improving access to healthcare services across the province.",
		department: "Ministry of Health",
		startDate: "2025-01-01",
		endDate: "2025-02-28",
		participantCount: 0,
		status: "upcoming",
		level: "provincial",
	},
];

export default function ConsultationsPage() {
	const [loading, setLoading] = useState(true);
	const [consultations, setConsultations] = useState<Consultation[]>([]);
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
			setConsultations(PLACEHOLDER_CONSULTATIONS);
			setLoading(false);
		}, 500);
	}, []);

	const getDaysRemaining = (endDate: string) => {
		const end = new Date(endDate);
		const now = new Date();
		const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		return diff;
	};

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
								<MessageSquare className="w-5 h-5" />
							</div>
							<div>
								<h1 className="text-2xl font-bold">Public Consultations</h1>
								<p className="text-sm text-gray-500">
									Have your say on government initiatives and policy decisions
								</p>
							</div>
						</div>
					</div>

					{/* Info Notice */}
					<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
						<div className="flex items-start gap-3">
							<MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
							<div>
								<p className="font-medium text-blue-800">Consultations Hub Coming Soon</p>
								<p className="text-sm text-blue-700 mt-1">
									We&apos;re aggregating public consultations from all levels of government. Below are examples of what you&apos;ll be able to participate in.
								</p>
							</div>
						</div>
					</div>

					{/* Consultations List */}
					<div className="space-y-4">
						{consultations.map((consultation) => {
							const daysRemaining = getDaysRemaining(consultation.endDate);
							return (
								<div
									key={consultation.id}
									className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
								>
									<div className="flex items-start justify-between gap-4 mb-3">
										<div className="flex items-center gap-2">
											<Badge className={cn("text-xs", STATUS_STYLES[consultation.status].color)}>
												{STATUS_STYLES[consultation.status].label}
											</Badge>
											<Badge variant="outline" className="text-xs capitalize">
												{consultation.level}
											</Badge>
											<span className="text-xs text-gray-500">{consultation.department}</span>
										</div>
									</div>
									
									<h3 className="font-semibold text-lg mb-2">{consultation.title}</h3>
									<p className="text-sm text-gray-600 mb-4">{consultation.description}</p>
									
									<div className="flex flex-wrap items-center justify-between gap-4">
										<div className="flex items-center gap-4 text-sm text-gray-500">
											<span className="flex items-center gap-1">
												<Calendar className="w-4 h-4" />
												{new Date(consultation.startDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} - {new Date(consultation.endDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
											</span>
											{consultation.status === "active" && (
												<span className="flex items-center gap-1">
													<Clock className="w-4 h-4" />
													{daysRemaining} days left
												</span>
											)}
											<span className="flex items-center gap-1">
												<Users className="w-4 h-4" />
												{consultation.participantCount} participants
											</span>
										</div>
										
										<Button variant={consultation.status === "active" ? "default" : "outline"} size="sm">
											{consultation.status === "active" ? "Participate" : "Learn More"}
											<ExternalLink className="w-3 h-3 ml-1" />
										</Button>
									</div>
									
									{consultation.status === "active" && (
										<div className="mt-4">
											<div className="flex justify-between text-xs text-gray-500 mb-1">
												<span>Consultation period</span>
												<span>{Math.max(0, 100 - (daysRemaining / 30) * 100).toFixed(0)}% complete</span>
											</div>
											<Progress value={Math.max(0, 100 - (daysRemaining / 30) * 100)} className="h-1.5" />
										</div>
									)}
								</div>
							);
						})}
					</div>

					{consultations.length === 0 && (
						<div className="text-center py-12 bg-white rounded-xl border">
							<MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
							<p className="text-gray-500 mb-2">No active consultations</p>
							<p className="text-sm text-gray-400">
								Check back later for opportunities to provide input
							</p>
						</div>
					)}
				</main>
			</div>
			<Footer />
		</>
	);
}
