import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://1005-labs.vercel.app"),
  title: "PJP Sales Copilot | Neo4j GraphRAG",
  description: "Knowledge Graph and Vector-less RAG Sales Optimization Dashboard for Field Sales Automation",
  openGraph: {
    title: "PJP Sales Copilot | Neo4j GraphRAG",
    description: "Knowledge Graph and Vector-less RAG Sales Optimization Dashboard for Field Sales Automation",
    url: "https://1005-labs.vercel.app",
    siteName: "PJP Sales Copilot",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-canvas text-text-main antialiased overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}

