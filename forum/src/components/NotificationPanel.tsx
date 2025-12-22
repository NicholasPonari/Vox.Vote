"use client";

import { useEffect, useState } from "react";
import { Notification } from "@/lib/types/ui";
import { NotificationItem } from "./NotificationItem";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Loader2 } from "lucide-react";

interface NotificationPanelProps {
	isOpen: boolean;
	onClose: () => void;
	onOpenChange?: (open: boolean) => void;
	trigger?: React.ReactNode;
	isMobile: boolean;
}

export function NotificationPanel({
	isOpen,
	onClose,
	onOpenChange,
	trigger,
	isMobile,
}: NotificationPanelProps) {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(false);

	useEffect(() => {
		if (isOpen) {
			fetchNotifications();
		}
	}, [isOpen]);

	const fetchNotifications = async () => {
		setLoading(true);
		try {
			const response = await fetch("/api/notifications?limit=20");
			if (response.ok) {
				const data = await response.json();
				setNotifications(data.notifications || []);
				setHasMore(data.has_more || false);
			}
		} catch (error) {
			console.error("Error fetching notifications:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleMarkAsRead = async (id: string) => {
		try {
			const response = await fetch(`/api/notifications/${id}/read`, {
				method: "PATCH",
			});

			if (response.ok) {
				setNotifications((prev) =>
					prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
				);
			}
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	};

	const handleMarkAllAsRead = async () => {
		try {
			const response = await fetch("/api/notifications/mark-all-read", {
				method: "PATCH",
			});

			if (response.ok) {
				setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
			}
		} catch (error) {
			console.error("Error marking all as read:", error);
		}
	};

	const content = (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b">
				<h2 className="text-lg font-semibold">Notifications</h2>
				{notifications.some((n) => !n.is_read) && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleMarkAllAsRead}
						className="text-xs text-blue-600 hover:text-blue-700"
					>
						Mark all read
					</Button>
				)}
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="w-6 h-6 animate-spin text-gray-400" />
					</div>
				) : notifications.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
							<svg
								className="w-8 h-8 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
								/>
							</svg>
						</div>
						<p className="text-sm font-medium text-gray-900">
							No notifications yet
						</p>
						<p className="text-sm text-gray-500 mt-1">
							We&apos;ll notify you when there&apos;s activity on your posts
						</p>
					</div>
				) : (
					<div>
						{notifications.map((notification) => (
							<NotificationItem
								key={notification.id}
								notification={notification}
								onRead={handleMarkAsRead}
							/>
						))}
						{hasMore && (
							<div className="p-4 text-center">
								<Button variant="ghost" size="sm" className="text-blue-600">
									Load more
								</Button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);

	if (isMobile) {
		return (
			<>
				{trigger}
				<Sheet open={isOpen} onOpenChange={onClose}>
					<SheetContent side="bottom" className="h-[80vh] p-0 z-[9999]">
						<SheetHeader className="sr-only">
							<SheetTitle>Notifications</SheetTitle>
						</SheetHeader>
						{content}
					</SheetContent>
				</Sheet>
			</>
		);
	}

	return (
		<Popover open={isOpen} onOpenChange={onOpenChange || onClose}>
			{trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
			<PopoverContent
				className="w-[400px] max-w-[calc(100vw-2rem)] h-[500px] p-0"
				align="end"
				sideOffset={8}
			>
				{content}
			</PopoverContent>
		</Popover>
	);
}
