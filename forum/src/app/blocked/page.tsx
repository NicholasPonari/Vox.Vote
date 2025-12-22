import { MapPin } from "lucide-react";

export const metadata = {
	title: "Not Available in Your Region",
};

const BlockedPage = () => {
	return (
		<main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-100 px-4">
			<div className="text-center">
				<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
					<MapPin className="h-10 w-10 text-red-600" />
				</div>
				<h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
					Not Available in Your Region
				</h1>
				<p className="mt-3 max-w-md text-sm text-gray-600 sm:text-base">
					Vox.Vote is currently only available to residents of Canada. We're
					working to expand to more regions in the future.
				</p>
				<p className="mt-6 text-xs text-gray-400">
					If you believe this is an error, please contact support.
				</p>
			</div>
		</main>
	);
};

export default BlockedPage;
