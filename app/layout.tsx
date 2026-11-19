import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bicara — Voice USDC Prototype & Architecture Studio',
  description:
    'Interactive Solana Mobile voice-to-USDC payment prototype, 2026 SDK migration workbench, and hackathon documentation suite for Bicara.',
  openGraph: {
    title: 'Bicara — Voice USDC Prototype & Architecture Studio',
    description:
      'Interactive Solana Mobile voice-to-USDC payment prototype, 2026 SDK migration workbench, and hackathon documentation suite for Bicara.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bicara — Voice USDC Prototype & Architecture Studio',
    description:
      'Interactive Solana Mobile voice-to-USDC payment prototype, 2026 SDK migration workbench, and hackathon documentation suite for Bicara.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning className="min-h-screen bg-[#0B0D0E] text-[#F8FAFC]">
        {children}
      </body>
    </html>
  );
}
