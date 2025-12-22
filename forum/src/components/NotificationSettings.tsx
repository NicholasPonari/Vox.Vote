"use client";

import { useEffect, useState } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { NotificationSettings as NotificationSettingsType } from "@/lib/types/ui";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function NotificationSettings() {
	const [settings, setSettings] = useState<NotificationSettingsType | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		fetchSettings();
	}, []);

	const fetchSettings = async () => {
		try {
			const response = await fetch("/api/notifications/settings");
			if (response.ok) {
				const data = await response.json();
				setSettings(data);
			}
		} catch (error) {
			console.error("Error fetching notification settings:", error);
			toast.error("Failed to load notification settings");
		} finally {
			setLoading(false);
		}
	};

	const handleToggle = async (
		field: keyof Omit<NotificationSettingsType, "user_id" | "updated_at">
	) => {
		if (!settings) return;

		const newSettings = { ...settings, [field]: !settings[field] };
		setSettings(newSettings);

		setSaving(true);
		try {
			const response = await fetch("/api/notifications/settings", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					[field]: newSettings[field],
				}),
			});

			if (response.ok) {
				toast.success("Settings updated");
			} else {
				// Revert on error
				setSettings(settings);
				toast.error("Failed to update settings");
			}
		} catch (error) {
			console.error("Error updating notification settings:", error);
			setSettings(settings);
			toast.error("Failed to update settings");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Notification Settings</CardTitle>
					<CardDescription>
						Manage your notification preferences
					</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center justify-center py-12">
					<Loader2 className="w-6 h-6 animate-spin text-gray-400" />
				</CardContent>
			</Card>
		);
	}

	if (!settings) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Notification Settings</CardTitle>
					<CardDescription>
						Manage your notification preferences
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-gray-500">Unable to load settings</p>
					<Button
						onClick={fetchSettings}
						variant="outline"
						size="sm"
						className="mt-4"
					>
						Try Again
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Notification Settings</CardTitle>
				<CardDescription>
					Choose what notifications you want to receive
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Comment on Post */}
				<div className="flex items-center justify-between space-x-4">
					<div className="flex-1 space-y-1">
						<Label htmlFor="comment-on-post" className="text-sm font-medium">
							Comments on your posts
						</Label>
						<p className="text-sm text-gray-500">
							Get notified when someone comments on your posts
						</p>
					</div>
					<Switch
						id="comment-on-post"
						checked={settings.comment_on_post_enabled}
						onCheckedChange={() => handleToggle("comment_on_post_enabled")}
						disabled={saving}
					/>
				</div>

				{/* Reply to Comment */}
				<div className="flex items-center justify-between space-x-4">
					<div className="flex-1 space-y-1">
						<Label htmlFor="reply-to-comment" className="text-sm font-medium">
							Replies to your comments
						</Label>
						<p className="text-sm text-gray-500">
							Get notified when someone replies to your comments
						</p>
					</div>
					<Switch
						id="reply-to-comment"
						checked={settings.reply_to_comment_enabled}
						onCheckedChange={() => handleToggle("reply_to_comment_enabled")}
						disabled={saving}
					/>
				</div>

				{/* Bookmark Summary */}
				<div className="flex items-center justify-between space-x-4">
					<div className="flex-1 space-y-1">
						<Label htmlFor="bookmark-summary" className="text-sm font-medium">
							Daily bookmark summaries
						</Label>
						<p className="text-sm text-gray-500">
							Get a daily summary of new activity on bookmarked posts (4 AM EST)
						</p>
					</div>
					<Switch
						id="bookmark-summary"
						checked={settings.bookmark_summary_enabled}
						onCheckedChange={() => handleToggle("bookmark_summary_enabled")}
						disabled={saving}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
