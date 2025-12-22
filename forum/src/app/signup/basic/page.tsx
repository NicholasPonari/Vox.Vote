"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabaseClient";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	CheckCircle2,
	User,
	MapPin,
	Loader2,
	AlertCircle,
	PenLine,
	ThumbsUp,
	Vote,
	MessageSquare,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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

const signUpSchema = z
	.object({
		email: z.string().email("Please enter a valid email"),
		username: z.string().min(3, "Username must be at least 3 characters"),
		password: z.string().min(6, "Password must be at least 6 characters"),
		confirmPassword: z.string().min(6, "Please confirm your password"),
		street: z.string().optional(),
		city: z.string().optional(),
		province: z.string().optional(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function BasicSignUpPage() {
	const [isSuccess, setIsSuccess] = useState(false);
	const [emailExists, setEmailExists] = useState(false);
	const [checkingEmail, setCheckingEmail] = useState(false);
	const [coordinates, setCoordinates] = useState<{
		lat: number;
		lng: number;
	} | null>(null);
	const [geocodingAddress, setGeocodingAddress] = useState(false);
	const [geocodeError, setGeocodeError] = useState<string | null>(null);

	const { setSession } = useAuth();
	const supabase = createClient();
	const router = useRouter();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setError,
		watch,
	} = useForm<SignUpFormValues>({
		resolver: zodResolver(signUpSchema),
		mode: "onChange",
	});

	const password = watch("password");
	const confirmPassword = watch("confirmPassword");
	const email = watch("email");
	const street = watch("street");
	const city = watch("city");
	const province = watch("province");

	const passwordsMatch =
		!!password && !!confirmPassword && password === confirmPassword;

	// Debounced email validation
	React.useEffect(() => {
		if (!email || !email.includes("@")) {
			setEmailExists(false);
			return;
		}

		const timeoutId = setTimeout(async () => {
			setCheckingEmail(true);
			try {
				const response = await fetch("/api/auth/check-email", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email }),
				});
				const data = await response.json();
				setEmailExists(data.exists || false);
			} catch (error) {
				console.error("Error checking email:", error);
				setEmailExists(false);
			} finally {
				setCheckingEmail(false);
			}
		}, 500);

		return () => clearTimeout(timeoutId);
	}, [email]);

	// Debounced address geocoding
	React.useEffect(() => {
		// Need at least street to geocode
		if (!street || street.trim().length < 5) {
			setCoordinates(null);
			setGeocodeError(null);
			return;
		}

		const timeoutId = setTimeout(async () => {
			setGeocodingAddress(true);
			setGeocodeError(null);
			try {
				const response = await fetch("/api/geocode", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ street, city, province }),
				});
				const data = await response.json();
				if (data.coordinates) {
					setCoordinates(data.coordinates);
					setGeocodeError(null);
				} else {
					setCoordinates(null);
					setGeocodeError("Could not find this address");
				}
			} catch (error) {
				console.error("Error geocoding address:", error);
				setCoordinates(null);
				setGeocodeError("Error looking up address");
			} finally {
				setGeocodingAddress(false);
			}
		}, 800);

		return () => clearTimeout(timeoutId);
	}, [street, city, province]);

	const onSubmit = async (data: SignUpFormValues) => {
		try {
			// Sign up with Supabase Auth
			const { error, data: sessionData } = await supabase.auth.signUp({
				email: data.email,
				password: data.password,
				options: {
					data: {
						username: data.username,
					},
				},
			});

			if (error) {
				console.error("[SignUp] Supabase signUp error", error);
				setError("email", { message: error.message });
				return;
			}

			const userId = sessionData?.user?.id;
			if (!userId) {
				setError("email", { message: "No user id returned from sign up." });
				return;
			}

			// Create profile with verified = false and coordinates (address is NOT stored - PII)
			const { error: profileError } = await supabase.from("profiles").insert({
				id: userId,
				username: data.username,
				type: "Member",
				verified: false,
				...(coordinates && { coord: coordinates }),
			});

			if (profileError) {
				console.error("[SignUp] Profile creation error", profileError);
				setError("username", { message: profileError.message });
				return;
			}

			setSession(sessionData.session);
			setIsSuccess(true);
			toast.success("Account created successfully! 🎉");
		} catch (error) {
			console.error("[SignUp] Error:", error);
			toast.error("Something went wrong. Please try again.");
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
							Welcome to Vox.Vote!
						</h1>
						<p className="text-lg text-gray-600">
							Your account has been created. You can now participate in
							community discussions.
						</p>

						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
							<p className="text-sm text-blue-900">
								<strong>Want more features?</strong> You can upgrade to a
								verified resident account anytime to access voting, polls, and
								direct government communication.
							</p>
						</div>

						<Button
							onClick={() => router.push("/")}
							size="lg"
							className="mt-8 px-8 py-6 text-lg"
						>
							Go to Home
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
				<div className="max-w-md mx-auto">
					<div className="text-center mb-8">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<User className="w-8 h-8 text-gray-600" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							Create Your Account
						</h1>
						<p className="text-gray-600">Join the community as a member</p>
					</div>

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-1">
							<Input
								label="Email"
								type="email"
								{...register("email")}
								error={
									errors.email?.message ||
									(emailExists ? "Email already exists" : undefined)
								}
								autoComplete="email"
							/>
							{checkingEmail && email && email.includes("@") && (
								<span className="text-xs text-gray-500 flex items-center gap-1">
									Checking availability...
								</span>
							)}
							{!checkingEmail &&
								email &&
								email.includes("@") &&
								!emailExists &&
								!errors.email && (
									<span className="text-xs text-green-600 flex items-center gap-1">
										✅ Email available
									</span>
								)}
						</div>

						<Input
							label="Username"
							type="text"
							{...register("username")}
							error={errors.username?.message}
							autoComplete="username"
							placeholder="Choose a display name"
						/>

						<Input
							label="Password"
							type="password"
							{...register("password")}
							error={errors.password?.message}
							autoComplete="new-password"
						/>

						<Input
							label="Confirm Password"
							type="password"
							{...register("confirmPassword")}
							error={errors.confirmPassword?.message}
							autoComplete="new-password"
						/>

						{confirmPassword && passwordsMatch && (
							<span className="flex items-center gap-1 text-green-600 text-sm font-medium">
								✅ Passwords match
							</span>
						)}

						{/* Optional Address Fields */}
						<div className="space-y-3 mt-4">
							<div className="flex items-center gap-2 mb-1">
								<MapPin className="w-4 h-4 text-gray-500" />
								<label className="font-medium text-sm">
									Address (Optional)
								</label>
							</div>
							<ShadcnInput
								{...register("street")}
								placeholder="123 Main Street"
								autoComplete="street-address"
							/>
							<div className="grid grid-cols-2 gap-3">
								<ShadcnInput
									{...register("city")}
									placeholder="City (e.g., Montreal)"
									autoComplete="address-level2"
								/>
								<ShadcnInput
									{...register("province")}
									placeholder="Province (e.g., QC)"
									autoComplete="address-level1"
								/>
							</div>
							<p className="text-xs text-gray-500">
								🔒 Your address is <strong>not saved</strong>. We only use it to
								determine your electoral districts so you see relevant local
								content.
							</p>
							{geocodingAddress && street && street.length >= 5 && (
								<span className="text-xs text-gray-500 flex items-center gap-1">
									<Loader2 className="w-3 h-3 animate-spin" />
									Looking up address...
								</span>
							)}
							{!geocodingAddress && coordinates && (
								<span className="text-xs text-green-600 flex items-center gap-1">
									✅ Address found - we can show you local content!
								</span>
							)}
							{!geocodingAddress && geocodeError && (
								<span className="text-xs text-amber-600 flex items-center gap-1">
									⚠️ {geocodeError} - you can still create your account
								</span>
							)}
						</div>

						<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
							<p className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-3">
								<AlertCircle className="w-4 h-4" />
								Member Account Limitations
							</p>
							<ul className="space-y-2 text-sm text-amber-700 mb-3">
								<li className="flex items-center gap-2">
									<MessageSquare className="w-4 h-4" />
									<span>
										<strong>5 comments</strong> per month only
									</span>
								</li>
								<li className="flex items-center gap-2">
									<PenLine className="w-4 h-4" />
									<span className="line-through">Cannot post new issues</span>
								</li>
								<li className="flex items-center gap-2">
									<ThumbsUp className="w-4 h-4" />
									<span className="line-through">
										Cannot upvote or downvote posts
									</span>
								</li>
								<li className="flex items-center gap-2">
									<Vote className="w-4 h-4" />
									<span className="line-through">Cannot vote on polls</span>
								</li>
							</ul>
							<p className="text-sm text-amber-800">
								Want full access?{" "}
								<Link
									href="/signup/verified"
									className="text-primary hover:underline font-medium"
								>
									Become a verified resident
								</Link>
							</p>
						</div>

						<Button
							type="submit"
							size="lg"
							className="w-full mt-6"
							disabled={isSubmitting || emailExists || checkingEmail}
						>
							{isSubmitting ? "Creating Account..." : "Create Account"}
						</Button>
					</form>

					<p className="text-center text-gray-600 mt-6">
						Already have an account?{" "}
						<Link href="/" className="text-primary hover:underline font-medium">
							Log in
						</Link>
					</p>
				</div>
			</main>
		</div>
	);
}
