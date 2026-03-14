import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata = {
  title: "SplitRight — Smart Expense Splitting & Settlement",
  description:
    "Split expenses effortlessly, settle debts instantly. SplitRight uses intelligent algorithms to minimize transactions and simplify group finances.",
  keywords: [
    "expense splitting",
    "group expenses",
    "settlement",
    "UPI",
    "Razorpay",
    "split bills",
  ],
  openGraph: {
    title: "SplitRight — Smart Expense Splitting & Settlement",
    description: "Split expenses effortlessly, settle debts instantly.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
