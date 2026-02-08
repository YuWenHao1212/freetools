import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The [locale] layout handles <html> and <body> tags.
  // This root layout just imports global CSS and passes children through.
  return children;
}
