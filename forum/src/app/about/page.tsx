import { Header } from "@/components/page_components/header";
import Image from "next/image";

const AboutPage = () => {
	return (
		<>
			<Header />
			<main className="min-h-screen bg-white">
				<section className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-12">
					<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
						About Us
					</h1>
					<p className="mt-2 text-sm text-gray-600 sm:text-base">
						Learn more about the founders of Vox.Vote and the vision behind the
						platform.
					</p>

					{/* Chris */}
					<article className="mt-8 flex flex-col items-start gap-4 sm:gap-6 md:flex-row md:items-center">
						<Image src="/chris.jpeg" alt="Chris Olimpo" width={500} height={500} className="h-28 w-28 shrink-0 rounded-full bg-gray-200 md:h-32 md:w-32"/>
						<div>
							<h2 className="text-xl font-semibold sm:text-2xl">
								Chris Olimpo
							</h2>
							<p className="mt-2 text-sm leading-6 text-gray-700 sm:text-base">
								Chris Olimpo is an award-winning creative director and
								entrepreneur whose career has taken him from the creative
								studios of San Francisco and Hollywood to the innovation hubs of
								Europe and Dubai. With a passion for storytelling, technology,
								and human connection, Chris has led projects that merge design,
								media, and emerging tech to inspire meaningful engagement and
								global collaboration.
							</p>
						</div>
					</article>

					{/* Nicholas */}
					<article className="mt-10 flex flex-col items-start gap-4 sm:gap-6 md:flex-row md:items-center">
						<Image src="/nick.jpg" alt="Nick Ponari" width={500} height={500} className="h-28 w-28 shrink-0 rounded-full bg-gray-200 md:h-32 md:w-32"/>
						<div>
							<h2 className="text-xl font-semibold sm:text-2xl">
								Nicholas Ponari
							</h2>
							<p className="mt-2 text-sm leading-6 text-gray-700 sm:text-base">
								Nicholas Ponari is an angel investor and tech entrepreneur
								focused on building companies that create positive social
								impact. With a background in fintech and healthtech, Nicholas
								brings deep expertise in data privacy and ethical innovation.
								His work centers on using technology responsibly to empower
								individuals and strengthen communities.
							</p>
						</div>
					</article>

					{/* Together */}
					<section className="mt-12">
						<h2 className="text-xl font-semibold sm:text-2xl">Together</h2>
						<p className="mt-2 text-sm leading-6 text-gray-700 sm:text-base">
							Chris and Nicholas founded Vox.Vote to reimagine how people engage
							with democracy. Vox.Vote is a Canadian social platform designed
							for civic and political discourse—helping citizens connect with
							their elected officials, discuss community issues, and
							collaboratively propose solutions. By using AI to summarize local
							conversations and share them directly with decision-makers,
							Vox.Vote bridges the gap between citizens and government.
						</p>
						<p className="mt-4 text-sm leading-6 text-gray-700 sm:text-base">
							Their shared vision is rooted in community and collective
							progress: when people come together to solve problems—starting in
							their neighbourhoods and growing outward—societies become safer,
							more informed, and more compassionate. The future of democracy,
							they believe, lies not in division or partisanship, but in
							collaboration, understanding, and love.
						</p>

						<div className="mt-6 overflow-hidden rounded-xl">
							<Image src="/nickandchris.jpg" alt="About" width={500} height={500} className="mx-auto" />
						</div>
					</section>
				</section>
			</main>
		</>
	);
};

export default AboutPage;
