"use client";

import React from "react";
import { StatsigProvider, useClientAsyncInit } from "@statsig/react-bindings";
import { StatsigAutoCapturePlugin } from "@statsig/web-analytics";
import { StatsigSessionReplayPlugin } from "@statsig/session-replay";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyStatsig({ children }: { children: React.ReactNode }) {
	const { client } = useClientAsyncInit(
		"client-FCsqn9W2urHzSp3WF258MbD6yL8ukmb4vq9SuOMvHTO",
		{ userID: "a-user" },
		{
			plugins: [
				new StatsigAutoCapturePlugin(),
				new StatsigSessionReplayPlugin(),
			],
		}
	);

	return (
		<StatsigProvider
			client={client}
			loadingComponent={
				<Skeleton className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100"></Skeleton>
			}
		>
			{children}
		</StatsigProvider>
	);
}
