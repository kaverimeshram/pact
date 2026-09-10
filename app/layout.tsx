import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PACT | Persistent Agent Commitment Tracker',
  description:
    'Memory-backed reputation system for AI agents powered by Sibyl Memory. Remembers commitments, deadlines, and outcomes across sessions to dynamically adapt economic decisions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="min-h-screen bg-[#09090b] text-[#f4f4f5] antialiased selection:bg-zinc-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
