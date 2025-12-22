"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Building2, CheckCircle2, Mail, User } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface FormInputProps extends React.ComponentProps<typeof ShadcnInput> {
	label: string;
	error?: string;
}

const Input = React.forwardRef<HTMLInputElement, FormInputProps>(
	({ label, error, ...props }, ref) => (
		<div className="flex flex-col gap-1">
			<label className="font-medium text-sm mb-1">{label}</label>
			<ShadcnInput ref={ref} aria-invalid={!!error} {...props} />
			{error && <span className="text-xs text-destructive mt-1">{error}</span>}
		</div>
	)
);
Input.displayName = "Input";

const governmentRequestSchema = z.object({
	fullName: z.string().min(2, "Please enter your full name"),
	email: z.string().email("Please enter a valid email"),
	role: z.string().min(1, "Please select your role"),
	position: z.string().min(2, "Please enter your position/title"),
	organization: z.string().min(2, "Please enter your organization"),
	jurisdiction: z.string().min(2, "Please enter your jurisdiction"),
	message: z.string().optional(),
});

type GovernmentRequestFormValues = z.infer<typeof governmentRequestSchema>;

export default function GovernmentSignUpPage() {
	const [isSuccess, setIsSuccess] = useState(false);
	const [selectedRole, setSelectedRole] = useState("");

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setValue,
	} = useForm<GovernmentRequestFormValues>({
		resolver: zodResolver(governmentRequestSchema),
	});

	const onSubmit = async (data: GovernmentRequestFormValues) => {
		try {
			const response = await fetch("/api/auth/government-request", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to submit request");
			}

			setIsSuccess(true);
			toast.success("Request submitted successfully!");
		} catch (error) {
			console.error("Error submitting request:", error);
			toast.error("Failed to submit request. Please try again.");
		}
	};

	if (isSuccess) {
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
					</div>
				</header>

				<main className="container mx-auto px-4 py-12">
					<div className="max-w-md mx-auto text-center space-y-6">
						<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
							<CheckCircle2 className="w-10 h-10 text-green-600" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900">
							Request Submitted!
						</h1>
						<p className="text-lg text-gray-600">
							Thank you for your interest in joining Vox.Vote as a government
							official. Our team will review your request and contact you to
							schedule an in-person verification meeting.
						</p>

						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
							<h3 className="font-semibold text-blue-900 mb-2">
								What happens next?
							</h3>
							<ul className="text-sm text-blue-900 space-y-2">
								<li className="flex items-start gap-2">
									<Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
									<span>You&apos;ll receive a confirmation email shortly</span>
								</li>
								<li className="flex items-start gap-2">
									<User className="w-4 h-4 mt-0.5 flex-shrink-0" />
									<span>
										Our team will reach out to schedule an in-person meeting
									</span>
								</li>
								<li className="flex items-start gap-2">
									<CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
									<span>
										After verification, we&apos;ll create your official account
									</span>
								</li>
							</ul>
						</div>

						<Button asChild size="lg" className="mt-8 px-8 py-6 text-lg">
							<Link href="/">Return to Home</Link>
						</Button>
					</div>
				</main>
			</div>
		);
	}

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
					<Link href="/signup">
						<Button
							variant="outline"
							className="text-primary rounded-full border-primary hover:bg-primary/10"
						>
							<ArrowLeft className="w-4 h-4" />
							Back to Sign Up Options
						</Button>
					</Link>
				</div>
			</header>

			{/* Main Content */}
			<main className="container mx-auto px-4 py-12">
				<div className="max-w-lg mx-auto">
					<div className="text-center mb-8">
						<div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
							<Building2 className="w-8 h-8 text-blue-600" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							Government Official Access
						</h1>
						<p className="text-gray-600">
							Request access for politicians and government employees
						</p>
					</div>

					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
						<p className="text-sm text-blue-900">
							<strong>In-person verification required:</strong> To ensure
							authenticity, all government accounts are created after an
							in-person meeting with our team. Submit your request below and
							we&apos;ll contact you to schedule a meeting.
						</p>
					</div>

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<Input
							label="Full Name"
							type="text"
							{...register("fullName")}
							error={errors.fullName?.message}
							placeholder="e.g., Jean-François Tremblay"
						/>

						<Input
							label="Government Email"
							type="email"
							{...register("email")}
							error={errors.email?.message}
							placeholder="e.g., jf.tremblay@ville.montreal.qc.ca"
						/>

						<div className="flex flex-col gap-1">
							<label className="font-medium text-sm mb-1">Role Type</label>
							<Select
								value={selectedRole}
								onValueChange={(value) => {
									setSelectedRole(value);
									setValue("role", value);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select your role type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="elected_municipal">
										Elected Official - Municipal
									</SelectItem>
									<SelectItem value="elected_provincial">
										Elected Official - Provincial
									</SelectItem>
									<SelectItem value="elected_federal">
										Elected Official - Federal
									</SelectItem>
									<SelectItem value="staff_municipal">
										Government Staff - Municipal
									</SelectItem>
									<SelectItem value="staff_provincial">
										Government Staff - Provincial
									</SelectItem>
									<SelectItem value="staff_federal">
										Government Staff - Federal
									</SelectItem>
								</SelectContent>
							</Select>
							{errors.role && (
								<span className="text-xs text-destructive mt-1">
									{errors.role.message}
								</span>
							)}
						</div>

						<Input
							label="Position/Title"
							type="text"
							{...register("position")}
							error={errors.position?.message}
							placeholder="e.g., City Councillor, MNA, Communications Director"
						/>

						<Input
							label="Organization"
							type="text"
							{...register("organization")}
							error={errors.organization?.message}
							placeholder="e.g., City of Montreal, Assemblée nationale du Québec"
						/>

						<Input
							label="Jurisdiction/District"
							type="text"
							{...register("jurisdiction")}
							error={errors.jurisdiction?.message}
							placeholder="e.g., Ville-Marie, Laurier-Dorion"
						/>

						<div className="flex flex-col gap-1">
							<label className="font-medium text-sm mb-1">
								Additional Information (Optional)
							</label>
							<Textarea
								{...register("message")}
								placeholder="Any additional information you'd like to share..."
								rows={3}
							/>
						</div>

						<Button
							type="submit"
							size="lg"
							className="w-full mt-6"
							disabled={isSubmitting}
						>
							{isSubmitting ? "Submitting..." : "Submit Request"}
						</Button>
					</form>

					<p className="text-center text-gray-600 mt-6 text-sm">
						For urgent inquiries, contact us directly at{" "}
						<a
							href="mailto:contact@vox.vote"
							className="text-primary hover:underline font-medium"
						>
							contact@vox.vote
						</a>
					</p>
				</div>
			</main>
		</div>
	);
}
