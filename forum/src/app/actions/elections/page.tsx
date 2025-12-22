"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/page_components/header";
import { Footer } from "@/components/page_components/footer";
import { DistrictNav } from "@/components/DistrictNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Vote, Calendar, MapPin, ExternalLink, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Election {
	id: string;
	title: string;
	type: "federal" | "provincial" | "municipal" | "by-election";
	date: string;
	registrationDeadline?: string;
	status: "upcoming" | "active" | "completed";
	description: string;
	voterInfoLink?: string;
}

const TYPE_STYLES = {
	federal: { label: "Federal", color: "bg-blue-100 text-blue-700" },
	provincial: { label: "Provincial", color: "bg-purple-100 text-purple-700" },
	municipal: { label: "Municipal", color: "bg-green-100 text-green-700" },
	"by-election": { label: "By-Election", color: "bg-orange-100 text-orange-700" },
};

const STATUS_STYLES = {
	upcoming: { label: "Upcoming", icon: Clock, color: "text-amber-600" },
	active: { label: "Voting Now", icon: CheckCircle2, color: "text-green-600" },
	completed: { label: "Completed", icon: CheckCircle2, color: "text-gray-500" },
};

const PLACEHOLDER_ELECTIONS: Election[] = [
	{
		id: "1",
		title: "Federal General Election",
		type: "federal",
		date: "2025-10-20",
		registrationDeadline: "2025-10-06",
		status: "upcoming",
		description: "Election to choose Members of Parliament for the 45th Canadian Parliament.",
		voterInfoLink: "https://elections.ca",
	},
	{
		id: "2",
		title: "Municipal By-Election - Ward 15",
		type: "by-election",
		date: "2025-02-15",
		registrationDeadline: "2025-02-01",
		status: "upcoming",
		description: "By-election to fill the vacant city councillor seat for Ward 15.",
	},
	{
		id: "3",
		title: "Ontario Provincial Election",
		type: "provincial",
		date: "2026-06-01",
		status: "upcoming",
		description: "Election to choose Members of Provincial Parliament for the 44th Ontario Legislature.",
		voterInfoLink: "https://elections.on.ca",
	},
];

const VOTER_CHECKLIST = [
	{ id: "registered", label: "Confirm your voter registration", description: "Make sure you're on the voters list" },
	{ id: "id", label: "Prepare your ID", description: "Know what identification you need to bring" },
	{ id: "location", label: "Find your polling station", description: "Know where and when to vote" },
	{ id: "candidates", label: "Research candidates", description: "Learn about who's running in your riding" },
];

export default function ElectionsPage() {
	const [loading, setLoading] = useState(true);
	const [elections, setElections] = useState<Election[]>([]);
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
			setElections(PLACEHOLDER_ELECTIONS);
			setLoading(false);
		}, 500);
	}, []);

	const getDaysUntil = (date: string) => {
		const target = new Date(date);
		const now = new Date();
		return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
								<Skeleton key={i} className="h-32" />
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
								<Vote className="w-5 h-5" />
							</div>
							<div>
								<h1 className="text-2xl font-bold">Elections & Voting</h1>
								<p className="text-sm text-gray-500">
									Stay informed about upcoming elections and how to participate
								</p>
							</div>
						</div>
					</div>

					{/* Voter Checklist */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle className="text-lg flex items-center gap-2">
								<CheckCircle2 className="w-5 h-5 text-primary" />
								Voter Checklist
							</CardTitle>
							<CardDescription>Make sure you&apos;re ready to vote</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-3 sm:grid-cols-2">
								{VOTER_CHECKLIST.map((item) => (
									<div 
										key={item.id}
										className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
									>
										<div className="w-5 h-5 rounded border-2 border-gray-300 mt-0.5" />
										<div>
											<p className="font-medium text-sm">{item.label}</p>
											<p className="text-xs text-gray-500">{item.description}</p>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Info Notice */}
					<div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
						<div className="flex items-start gap-3">
							<Vote className="w-5 h-5 text-red-600 mt-0.5" />
							<div>
								<p className="font-medium text-red-800">Elections Hub Coming Soon</p>
								<p className="text-sm text-red-700 mt-1">
									We&apos;re building comprehensive election information including candidate profiles, riding information, and voter resources. Below are example elections.
								</p>
							</div>
						</div>
					</div>

					{/* Elections List */}
					<h2 className="text-lg font-semibold mb-4">Upcoming Elections</h2>
					<div className="space-y-4">
						{elections.map((election) => {
							const daysUntil = getDaysUntil(election.date);
							const StatusIcon = STATUS_STYLES[election.status].icon;
							return (
								<div
									key={election.id}
									className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
								>
									<div className="flex items-start justify-between gap-4 mb-3">
										<div className="flex items-center gap-2">
											<Badge className={cn("text-xs", TYPE_STYLES[election.type].color)}>
												{TYPE_STYLES[election.type].label}
											</Badge>
											<span className={cn("text-xs flex items-center gap-1", STATUS_STYLES[election.status].color)}>
												<StatusIcon className="w-3 h-3" />
												{STATUS_STYLES[election.status].label}
											</span>
										</div>
										{daysUntil > 0 && (
											<span className="text-sm font-medium text-primary">
												{daysUntil} days away
											</span>
										)}
									</div>
									
									<h3 className="font-semibold text-lg mb-2">{election.title}</h3>
									<p className="text-sm text-gray-600 mb-4">{election.description}</p>
									
									<div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
										<span className="flex items-center gap-1">
											<Calendar className="w-4 h-4" />
											{new Date(election.date).toLocaleDateString("en-CA", {
												weekday: "long",
												month: "long",
												day: "numeric",
												year: "numeric",
											})}
										</span>
										{election.registrationDeadline && (
											<span className="flex items-center gap-1 text-amber-600">
												<AlertCircle className="w-4 h-4" />
												Register by {new Date(election.registrationDeadline).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
											</span>
										)}
									</div>
									
									<div className="flex gap-2">
										{election.voterInfoLink && (
											<Button variant="outline" size="sm" asChild>
												<a href={election.voterInfoLink} target="_blank" rel="noopener noreferrer">
													<ExternalLink className="w-4 h-4 mr-1" />
													Voter Info
												</a>
											</Button>
										)}
										<Button size="sm" variant="outline" disabled>
											View Candidates (Coming Soon)
										</Button>
									</div>
								</div>
							);
						})}
					</div>

					{elections.length === 0 && (
						<div className="text-center py-12 bg-white rounded-xl border">
							<Vote className="w-12 h-12 mx-auto text-gray-300 mb-3" />
							<p className="text-gray-500 mb-2">No upcoming elections</p>
							<p className="text-sm text-gray-400">
								Check back for election announcements
							</p>
						</div>
					)}
				</main>
			</div>
			<Footer />
		</>
	);
}
