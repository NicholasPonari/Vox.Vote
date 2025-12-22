"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/page_components/header";
import { Footer } from "@/components/page_components/footer";
import { DistrictNav } from "@/components/DistrictNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarDays, MapPin, Clock, ExternalLink, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Event {
	id: string;
	title: string;
	description: string;
	date: string;
	time: string;
	location: string;
	type: "town-hall" | "council-meeting" | "public-hearing" | "community" | "election";
	level: "federal" | "provincial" | "municipal";
	link?: string;
}

const EVENT_TYPES = {
	"town-hall": { label: "Town Hall", color: "bg-blue-100 text-blue-700" },
	"council-meeting": { label: "Council Meeting", color: "bg-purple-100 text-purple-700" },
	"public-hearing": { label: "Public Hearing", color: "bg-orange-100 text-orange-700" },
	"community": { label: "Community Event", color: "bg-green-100 text-green-700" },
	"election": { label: "Election", color: "bg-red-100 text-red-700" },
};

const PLACEHOLDER_EVENTS: Event[] = [
	{
		id: "1",
		title: "City Council Meeting",
		description: "Regular bi-weekly city council meeting. Public comments welcome.",
		date: "2024-12-18",
		time: "7:00 PM",
		location: "City Hall, Council Chambers",
		type: "council-meeting",
		level: "municipal",
	},
	{
		id: "2",
		title: "Community Town Hall on Transit",
		description: "Discuss upcoming transit improvements and provide feedback on proposed routes.",
		date: "2024-12-20",
		time: "6:30 PM",
		location: "Community Center, Main Hall",
		type: "town-hall",
		level: "municipal",
	},
	{
		id: "3",
		title: "Public Hearing: Zoning Amendment",
		description: "Public hearing on proposed zoning changes for the downtown core.",
		date: "2024-12-22",
		time: "2:00 PM",
		location: "Planning Office, Room 201",
		type: "public-hearing",
		level: "municipal",
	},
];

export default function EventsPage() {
	const [loading, setLoading] = useState(true);
	const [events, setEvents] = useState<Event[]>([]);
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
		// Simulate loading
		setTimeout(() => {
			setEvents(PLACEHOLDER_EVENTS);
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
								<CalendarDays className="w-5 h-5" />
							</div>
							<div>
								<h1 className="text-2xl font-bold">Upcoming Events</h1>
								<p className="text-sm text-gray-500">
									Town halls, council meetings, and civic events in your area
								</p>
							</div>
						</div>
					</div>

					{/* Coming Soon Notice */}
					<div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
						<div className="flex items-start gap-3">
							<Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
							<div>
								<p className="font-medium text-amber-800">Event Calendar Coming Soon</p>
								<p className="text-sm text-amber-700 mt-1">
									We&apos;re building an integrated calendar of civic events. Below are example events to show what&apos;s coming.
								</p>
							</div>
						</div>
					</div>

					{/* Events List */}
					<div className="space-y-4">
						{events.map((event) => (
							<div
								key={event.id}
								className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<Badge className={cn("text-xs", EVENT_TYPES[event.type].color)}>
												{EVENT_TYPES[event.type].label}
											</Badge>
											<Badge variant="outline" className="text-xs capitalize">
												{event.level}
											</Badge>
										</div>
										<h3 className="font-semibold text-lg">{event.title}</h3>
										<p className="text-sm text-gray-600 mt-1">{event.description}</p>
										<div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
											<span className="flex items-center gap-1">
												<CalendarDays className="w-4 h-4" />
												{new Date(event.date).toLocaleDateString("en-CA", {
													weekday: "short",
													month: "short",
													day: "numeric",
												})}
											</span>
											<span className="flex items-center gap-1">
												<Clock className="w-4 h-4" />
												{event.time}
											</span>
											<span className="flex items-center gap-1">
												<MapPin className="w-4 h-4" />
												{event.location}
											</span>
										</div>
									</div>
									{event.link && (
										<Button variant="outline" size="sm" asChild>
											<a href={event.link} target="_blank" rel="noopener noreferrer">
												<ExternalLink className="w-4 h-4 mr-1" />
												Details
											</a>
										</Button>
									)}
								</div>
							</div>
						))}
					</div>

					{events.length === 0 && (
						<div className="text-center py-12 bg-white rounded-xl border">
							<CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-3" />
							<p className="text-gray-500 mb-2">No upcoming events</p>
							<p className="text-sm text-gray-400">
								Check back later for civic events in your area
							</p>
						</div>
					)}
				</main>
			</div>
			<Footer />
		</>
	);
}
