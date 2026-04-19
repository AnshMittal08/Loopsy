export const metadata = {
  title: "Crochet AI Designer API",
  description: "Backend API for the Crochet AI Designer platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
