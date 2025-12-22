"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabaseClient";
import { Input as ShadcnInput } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

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

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const resetPasswordSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const PasswordResetForm = ({ onBack }: { onBack?: () => void }) => {
	const [isSuccess, setIsSuccess] = React.useState(false);
	const supabase = createClient();
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordSchema),
	});

	const onSubmit = async (data: ResetPasswordFormValues) => {
		const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
			redirectTo: `${window.location.origin}/reset-password`,
		});

		if (error) {
			toast.error(error.message);
		} else {
			setIsSuccess(true);
		}
	};

	if (isSuccess) {
		return (
			<div className="flex flex-col gap-4">
				<div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
					<div className="text-green-600 text-4xl mb-3">✓</div>
					<p className="text-green-800 font-medium mb-2">
						If you have an account with us, an email will be sent with
						instructions on resetting your password.
					</p>
					<p className="text-green-700 text-sm">
						It is now safe to close this window.
					</p>
				</div>
				{onBack && (
					<Button
						type="button"
						variant="outline"
						onClick={onBack}
						className="w-full"
					>
						Back to Login
					</Button>
				)}
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
			<p className="text-sm text-muted-foreground mb-2">
				Enter your email address and we&apos;ll send you instructions to reset
				your password.
			</p>
			<Input
				label="Email"
				type="email"
				{...register("email")}
				error={errors.email?.message}
				autoComplete="email"
				autoFocus
			/>
			<div className="flex gap-2 mt-2">
				{onBack && (
					<Button
						type="button"
						variant="outline"
						onClick={onBack}
						className="flex-1"
					>
						Back
					</Button>
				)}
				<Button
					type="submit"
					disabled={isSubmitting}
					className={onBack ? "flex-1" : "w-full"}
				>
					{isSubmitting ? "Sending..." : "Send Reset Link"}
				</Button>
			</div>
		</form>
	);
};

export const AuthLoginForm = ({
	onSuccess,
	onForgotPassword,
}: {
	onSuccess: () => void;
	onForgotPassword?: () => void;
}) => {
	const { setSession } = useAuth();
	const supabase = createClient();
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setError,
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
	});

	const onSubmit = async (data: LoginFormValues) => {
		const { error, data: sessionData } = await supabase.auth.signInWithPassword(
			{
				email: data.email,
				password: data.password,
			}
		);
		if (error) {
			setError("email", { message: error.message });
		} else {
			setSession(sessionData.session);
			onSuccess();
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
			<Input
				label="Email"
				type="email"
				{...register("email")}
				error={errors.email?.message}
				autoComplete="email"
			/>
			<Input
				label="Password"
				type="password"
				{...register("password")}
				error={errors.password?.message}
				autoComplete="current-password"
			/>
			<Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
				{isSubmitting ? "Logging in..." : "Log In"}
			</Button>
			<div className="flex gap-2 mt-2 justify-between">
				<p className="text-sm mt-2">
					New to Vox?{" "}
					<Link className="underline text-primary" href="/signup">
						Sign Up
					</Link>
				</p>
				<Button
					type="button"
					variant="link"
					onClick={onForgotPassword}
					className="self-end text-sm px-0 h-auto"
				>
					Forgot your password?
				</Button>
			</div>
		</form>
	);
};
