import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CuotaFácil SaaS V2',
  description: 'Panel maestro multi-cliente para gestión de cuotas y pagos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
