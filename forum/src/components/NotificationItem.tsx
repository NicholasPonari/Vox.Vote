import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Notification } from "@/lib/types/ui";
import { User } from "lucide-react";
import { formatTimeAgo } from "@/lib/timeUtils";
import { useRouter } from "next/navigation";

interface NotificationItemProps {
	notification: Notification;
	onRead: (id: string) => void;
}

export function NotificationItem({
	notification,
	onRead,
}: NotificationItemProps) {
	const router = useRouter();

	const handleClick = () => {
		// Mark as read
		if (!notification.is_read) {
			onRead(notification.id);
		}

		// Navigate to the post
		if (notification.issue_id) {
			router.push(`/${notification.issue_id}`);
		}
	};

	const getNotificationText = () => {
		switch (notification.type) {
			case "comment_on_post":
				return (
					<>
						<span className="font-semibold">{notification.actor_username}</span>{" "}
						commented on your post{" "}
						<span className="font-medium">
							&quot;{notification.issue_title}&quot;
						</span>
					</>
				);
			case "reply_to_comment":
				return (
					<>
						<span className="font-semibold">{notification.actor_username}</span>{" "}
						replied to your comment on{" "}
						<span className="font-medium">
							&quot;{notification.issue_title}&quot;
						</span>
					</>
				);
			case "bookmark_summary":
				return (
					<>
						<span className="font-semibold">
							{notification.aggregate_count} new comment
							{notification.aggregate_count !== 1 ? "s" : ""}
						</span>{" "}
						on{" "}
						<span className="font-medium">
							&quot;{notification.issue_title}&quot;
						</span>
					</>
				);
			default:
				return "New notification";
		}
	};

	return (
		<div
			onClick={handleClick}
			className={`flex gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 ${
				!notification.is_read ? "bg-blue-50/50" : ""
			}`}
		>
			{/* Avatar (only for user actions, not bookmark summaries) */}
			{notification.type !== "bookmark_summary" && (
				<Avatar className="w-10 h-10 flex-shrink-0">
					<AvatarImage src={notification.actor_avatar_url || ""} />
					<AvatarFallback className="bg-gray-200">
						<User className="w-5 h-5 text-gray-500" />
					</AvatarFallback>
				</Avatar>
			)}

			{/* Content */}
			<div className="flex-1 min-w-0">
				<p className="text-sm text-gray-900 leading-snug">
					{getNotificationText()}
				</p>

				{/* Content preview for comments/replies */}
				{notification.content_preview &&
					notification.type !== "bookmark_summary" && (
						<p className="text-sm text-gray-600 mt-1 line-clamp-2">
							{notification.content_preview}
						</p>
					)}

				{/* Time ago */}
				<p className="text-xs text-gray-500 mt-1">
					{formatTimeAgo(notification.created_at)}
				</p>
			</div>

			{/* Unread indicator */}
			{!notification.is_read && (
				<div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
			)}
		</div>
	);
}
