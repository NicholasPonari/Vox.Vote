"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabaseClient";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

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

const resetPasswordSchema = z
	.object({
		password: z.string().min(6, "Password must be at least 6 characters"),
		confirmPassword: z.string().min(6, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
	const router = useRouter();
	const supabase = createClient();
	const [isValidToken, setIsValidToken] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [passwordsMatch, setPasswordsMatch] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordSchema),
		mode: "onChange",
	});

	const password = watch("password");
	const confirmPassword = watch("confirmPassword");

	useEffect(() => {
		setPasswordsMatch(
			!!password && !!confirmPassword && password === confirmPassword
		);
	}, [password, confirmPassword]);

	useEffect(() => {
		// Check if user has a valid recovery token
		const checkSession = async () => {
			// First, check if there's a hash fragment with token info
			const hashParams = new URLSearchParams(window.location.hash.substring(1));
			const accessToken = hashParams.get('access_token');
			const type = hashParams.get('type');

			// If this is a recovery link, the session should already be set by Supabase
			if (type === 'recovery' && accessToken) {
				setIsValidToken(true);
				setIsLoading(false);
				return;
			}

			// Otherwise, check for an existing session
			const { data, error } = await supabase.auth.getSession();

			if (error || !data.session) {
				setIsValidToken(false);
				toast.error("Invalid or expired reset link. Please request a new one.");
			} else {
				setIsValidToken(true);
			}
			setIsLoading(false);
		};

		checkSession();
	}, [supabase.auth]);

	const onSubmit = async (data: ResetPasswordFormValues) => {
		const { error } = await supabase.auth.updateUser({
			password: data.password,
		});

		if (error) {
			toast.error(error.message);
		} else {
			toast.success("Password updated successfully! Redirecting to home...");
			setTimeout(() => {
				router.push("/");
			}, 2000);
		}
	};

	if (isLoading) {
		return (
			<Skeleton className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100"></Skeleton>
		);
	}

	if (!isValidToken) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100">
				<div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
					<h1 className="text-2xl font-bold text-center mb-4">
						Invalid Reset Link
					</h1>
					<p className="text-gray-600 text-center mb-6">
						This password reset link is invalid or has expired. Please request a
						new password reset.
					</p>
					<Button onClick={() => router.push("/")} className="w-full">
						Return to Home
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100 p-4">
			<div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
				<h1 className="text-2xl font-bold text-center mb-2">
					Reset Your Password
				</h1>
				<p className="text-gray-600 text-center mb-6">
					Enter your new password below
				</p>

				<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
					<Input
						label="New Password"
						type="password"
						{...register("password")}
						error={errors.password?.message}
						autoComplete="new-password"
					/>
					<Input
						label="Confirm New Password"
						type="password"
						{...register("confirmPassword")}
						error={errors.confirmPassword?.message}
						autoComplete="new-password"
					/>
					{confirmPassword && passwordsMatch && (
						<span className="flex items-center gap-1 text-green-600 text-sm font-medium mt-[-0.5rem] select-none">
							✅ Passwords match
						</span>
					)}
					<Button
						type="submit"
						disabled={isSubmitting || !passwordsMatch}
						className="mt-2 w-full"
					>
						{isSubmitting ? "Updating password..." : "Update Password"}
					</Button>
				</form>
			</div>
		</div>
	);
}
