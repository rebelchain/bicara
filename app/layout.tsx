import type { Metadata } from 'next';
import { Grandstander, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const grandstander = Grandstander({
  subsets: ['latin'],
  variable: '--font-grandstander',
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
  title: 'Bicara — Speak Before You Sign on Solana',
  description:
    'Before you sign anything on Solana, Bicara reads every recipient, amount, and fee out loud. Built blind-first for calm, eyes-free clarity.',
  openGraph: {
    title: 'Bicara — Speak Before You Sign on Solana',
    description:
      'Before you sign anything on Solana, Bicara reads every recipient, amount, and fee out loud. Built blind-first for calm, eyes-free clarity.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bicara — Speak Before You Sign on Solana',
    description:
      'Before you sign anything on Solana, Bicara reads every recipient, amount, and fee out loud. Built blind-first for calm, eyes-free clarity.',
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
      className={`${grandstander.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning className="min-h-screen bg-[#FAF9F5] text-[#1E3124]">
        {children}
      </body>
    </html>
  );
}
