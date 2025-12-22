"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

function isSafeHref(href: string) {
	if (href.startsWith("/")) return true;

	try {
		const url = new URL(href, "https://localhost");
		return ["http:", "https:", "mailto:"].includes(url.protocol);
	} catch {
		return false;
	}
}

export function MarkdownContent({ content }: { content: string }) {
	const components = {
		p: ({ children }: React.ComponentPropsWithoutRef<"p">) => (
			<p className="mb-4 last:mb-0">{children}</p>
		),
		a: ({ href, children }: React.ComponentPropsWithoutRef<"a">) => {
			if (!href) return <span>{children}</span>;
			if (!isSafeHref(href)) return <span>{children}</span>;

			const isExternal = !href.startsWith("/");
			return (
				<a
					href={href}
					target={isExternal ? "_blank" : undefined}
					rel={isExternal ? "noopener noreferrer" : undefined}
					className="text-primary underline underline-offset-2 break-words"
				>
					{children}
				</a>
			);
		},
		ul: ({ children }: React.ComponentPropsWithoutRef<"ul">) => (
			<ul className="mb-4 last:mb-0 list-disc pl-6">{children}</ul>
		),
		ol: ({ children }: React.ComponentPropsWithoutRef<"ol">) => (
			<ol className="mb-4 last:mb-0 list-decimal pl-6">{children}</ol>
		),
		li: ({ children }: React.ComponentPropsWithoutRef<"li">) => (
			<li className="mt-1">{children}</li>
		),
		blockquote: ({
			children,
		}: React.ComponentPropsWithoutRef<"blockquote">) => (
			<blockquote className="mb-4 last:mb-0 border-l-4 border-gray-200 pl-4 text-gray-600">
				{children}
			</blockquote>
		),
		h1: ({ children }: React.ComponentPropsWithoutRef<"h1">) => (
			<h1 className="mb-3 mt-6 first:mt-0 text-2xl font-bold text-gray-900">
				{children}
			</h1>
		),
		h2: ({ children }: React.ComponentPropsWithoutRef<"h2">) => (
			<h2 className="mb-3 mt-6 first:mt-0 text-xl font-bold text-gray-900">
				{children}
			</h2>
		),
		h3: ({ children }: React.ComponentPropsWithoutRef<"h3">) => (
			<h3 className="mb-2 mt-5 first:mt-0 text-lg font-semibold text-gray-900">
				{children}
			</h3>
		),
		code: ({ children }: React.ComponentPropsWithoutRef<"code">) => (
			<code className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.95em] text-gray-800">
				{children}
			</code>
		),
		pre: ({ children }: React.ComponentPropsWithoutRef<"pre">) => (
			<pre className="mb-4 last:mb-0 overflow-x-auto rounded-lg bg-gray-100 p-3 text-sm">
				{children}
			</pre>
		),
	};

	return (
		<div className="text-gray-700 leading-relaxed break-words">
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkBreaks]}
				components={components}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
