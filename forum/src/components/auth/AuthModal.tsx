import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogClose,
} from "@/components/ui/dialog";
import { AuthLoginForm, PasswordResetForm } from "./AuthForms";

interface AuthModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
	const [showPasswordReset, setShowPasswordReset] = useState(false);

	const handleOpenChange = (newOpen: boolean) => {
		onOpenChange(newOpen);
		if (!newOpen) {
			// Reset internal state when closed
			setTimeout(() => setShowPasswordReset(false), 200);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-md w-full">
				<DialogHeader>
					<DialogTitle>
						{showPasswordReset ? "Reset Password" : "Log In"}
					</DialogTitle>
				</DialogHeader>
				<div className="mt-4">
					{showPasswordReset ? (
						<PasswordResetForm onBack={() => setShowPasswordReset(false)} />
					) : (
						<AuthLoginForm
							onSuccess={() => {
								handleOpenChange(false);
							}}
							onForgotPassword={() => setShowPasswordReset(true)}
						/>
					)}
				</div>
				<DialogClose asChild></DialogClose>
			</DialogContent>
		</Dialog>
	);
}
