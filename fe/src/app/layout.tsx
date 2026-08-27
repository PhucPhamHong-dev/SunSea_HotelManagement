import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { QueryProvider } from '../components/layout/query-provider';
import '../styles/globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
});

export const metadata: Metadata = {
  title: 'SUNSEA Hotel Management',
  description: 'Hotel operations dashboard',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${beVietnamPro.className} ${beVietnamPro.variable}`}><QueryProvider>{children}</QueryProvider></body>
    </html>
  );
}
