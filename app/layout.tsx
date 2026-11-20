import type { Metadata } from 'next';
import { Bricolage_Grotesque, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bicara — Spoken Transaction Verification for Solana',
  description:
    'Before you sign anything on Solana, Bicara reads exactly what will happen — out loud. Built blind-first: proven to work with zero screen, so it works for everyone.',
  openGraph: {
    title: 'Bicara — Spoken Transaction Verification for Solana',
    description:
      'Before you sign anything on Solana, Bicara reads exactly what will happen — out loud. Built blind-first: proven to work with zero screen, so it works for everyone.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bicara — Spoken Transaction Verification for Solana',
    description:
      'Before you sign anything on Solana, Bicara reads exactly what will happen — out loud. Built blind-first: proven to work with zero screen, so it works for everyone.',
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
      className={`${bricolageGrotesque.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning className="min-h-screen bg-[#0F0F0F] text-[#F4F4F5]">
        {children}
      </body>
    </html>
  );
}
