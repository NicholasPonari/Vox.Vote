"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/page_components/header";
import { Footer } from "@/components/page_components/footer";
import { DistrictNav } from "@/components/DistrictNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lightbulb, Bug, Sparkles, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const FEEDBACK_TYPES = [
	{ id: "feature", label: "Feature Idea", icon: Lightbulb, description: "Suggest a new feature or improvement" },
	{ id: "bug", label: "Bug Report", icon: Bug, description: "Report something that's not working" },
	{ id: "improvement", label: "Improvement", icon: Sparkles, description: "Suggest an enhancement to existing features" },
	{ id: "other", label: "Other Feedback", icon: MessageSquare, description: "General feedback or comments" },
];

export default function FeedbackPage() {
	const [scrollProgress, setScrollProgress] = useState(0);
	const [feedbackType, setFeedbackType] = useState("feature");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		
		// Simulate submission delay
		await new Promise((resolve) => setTimeout(resolve, 1000));
		
		// In a real implementation, this would send to a backend/database
		console.log("Feedback submitted:", { feedbackType, title, description, email });
		
		setSubmitted(true);
		setSubmitting(false);
	};

	const handleReset = () => {
		setSubmitted(false);
		setFeedbackType("feature");
		setTitle("");
		setDescription("");
		setEmail("");
	};

	return (
		<>
			<Header logoRef={headerLogoRef} logoOpacity={scrollProgress} />
			<div className="flex min-h-screen bg-gray-50">
				<aside className="hidden lg:block w-64 border-r bg-white shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
					<DistrictNav />
				</aside>

				<main className="flex-1 max-w-2xl mx-auto py-6 px-4">
					<div className="mb-6">
						<Link
							href="/"
							className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
						>
							<ArrowLeft className="w-4 h-4" />
							Back to home
						</Link>
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 text-amber-600">
								<Lightbulb className="w-5 h-5" />
							</div>
							<div>
								<h1 className="text-2xl font-bold">Submit a Feature Idea</h1>
								<p className="text-sm text-gray-500">
									Help us improve Vox.Vote with your feedback
								</p>
							</div>
						</div>
					</div>

					{submitted ? (
						<Card>
							<CardContent className="pt-6">
								<div className="text-center py-8">
									<div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
										<CheckCircle2 className="w-8 h-8 text-green-600" />
									</div>
									<h2 className="text-xl font-semibold mb-2">Thank You!</h2>
									<p className="text-gray-600 mb-6">
										Your feedback has been submitted. We appreciate you taking the time to help improve Vox.Vote.
									</p>
									<Button onClick={handleReset} variant="outline">
										Submit Another Idea
									</Button>
								</div>
							</CardContent>
						</Card>
					) : (
						<form onSubmit={handleSubmit}>
							<Card className="mb-6">
								<CardHeader>
									<CardTitle>What type of feedback?</CardTitle>
									<CardDescription>Select the category that best fits your feedback</CardDescription>
								</CardHeader>
								<CardContent>
									<RadioGroup
										value={feedbackType}
										onValueChange={setFeedbackType}
										className="grid grid-cols-2 gap-3"
									>
										{FEEDBACK_TYPES.map((type) => {
											const Icon = type.icon;
											return (
												<Label
													key={type.id}
													htmlFor={type.id}
													className={cn(
														"flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
														feedbackType === type.id
															? "border-primary bg-primary/5"
															: "border-gray-200 hover:border-gray-300"
													)}
												>
													<RadioGroupItem value={type.id} id={type.id} className="mt-1" />
													<div className="flex-1">
														<div className="flex items-center gap-2 mb-1">
															<Icon className="w-4 h-4 text-gray-600" />
															<span className="font-medium">{type.label}</span>
														</div>
														<p className="text-xs text-gray-500">{type.description}</p>
													</div>
												</Label>
											);
										})}
									</RadioGroup>
								</CardContent>
							</Card>

							<Card className="mb-6">
								<CardHeader>
									<CardTitle>Details</CardTitle>
									<CardDescription>Tell us more about your idea or feedback</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="title">Title *</Label>
										<Input
											id="title"
											placeholder="Brief summary of your idea"
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											required
										/>
									</div>
									
									<div className="space-y-2">
										<Label htmlFor="description">Description *</Label>
										<Textarea
											id="description"
											placeholder="Describe your idea in detail. What problem does it solve? How would it work?"
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											rows={6}
											required
										/>
									</div>
									
									<div className="space-y-2">
										<Label htmlFor="email">Email (optional)</Label>
										<Input
											id="email"
											type="email"
											placeholder="your@email.com"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
										/>
										<p className="text-xs text-gray-500">
											We&apos;ll only use this to follow up on your feedback if needed
										</p>
									</div>
								</CardContent>
							</Card>

							<div className="flex justify-end gap-3">
								<Button type="button" variant="outline" onClick={handleReset}>
									Clear
								</Button>
								<Button type="submit" disabled={submitting || !title || !description}>
									{submitting ? (
										"Submitting..."
									) : (
										<>
											<Send className="w-4 h-4 mr-2" />
											Submit Feedback
										</>
									)}
								</Button>
							</div>
						</form>
					)}

					{/* Tips */}
					<Card className="mt-6 bg-blue-50 border-blue-200">
						<CardContent className="pt-6">
							<h3 className="font-medium text-blue-800 mb-2">Tips for great feedback</h3>
							<ul className="text-sm text-blue-700 space-y-1">
								<li>• Be specific about the problem you&apos;re trying to solve</li>
								<li>• Explain how your idea would benefit other users</li>
								<li>• Include examples or scenarios where this would be useful</li>
								<li>• For bugs, describe the steps to reproduce the issue</li>
							</ul>
						</CardContent>
					</Card>
				</main>
			</div>
			<Footer />
		</>
	);
}
