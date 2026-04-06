import { Inter, JetBrains_Mono, Manrope } from 'next/font/google';
import { ReactNode } from 'react';
import '@/styles/globals.css';
import { Providers } from '@/app/providers';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

const manrope = Manrope({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-headline' });

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable} ${manrope.variable}`} data-theme="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
