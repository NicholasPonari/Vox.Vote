export function Footer() {
	return (
		<footer className="w-full bg-gradient-to-b from-white to-gray-100 border-t py-6 text-center text-sm text-gray-500">
			<span>
				&copy; {new Date().getFullYear()} vox.vote. All rights reserved.
			</span>
		</footer>
	);
}
