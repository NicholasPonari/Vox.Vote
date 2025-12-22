import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		minimumCacheTTL: 2678400,
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'bkhfmvsykdxazzwgprvd.supabase.co',
				pathname: '/storage/v1/object/public/**',
			},
			{
				protocol: 'https',
				hostname: 'image.mux.com',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'www.assnat.qc.ca',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'res.cloudinary.com',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'www.ourcommons.ca',
				pathname: '/**',
			},
		],
	},
};

export default nextConfig;
