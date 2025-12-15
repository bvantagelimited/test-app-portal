import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "App Distribution - IPification",
  description: "Internal app sharing tool",
  icons: {
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NC44OTIiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA0NC44OTIgNDUiPjxkZWZzPjxzdHlsZT4uYXtmaWxsOiNmZmY7fS5ie2ZpbGw6I2ZiMWM0NDt9PC9zdHlsZT48L2RlZnM+PHJlY3QgY2xhc3M9ImEiIHdpZHRoPSIzMSIgaGVpZ2h0PSIyNiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNi45OTkgOSkiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDApIj48cGF0aCBjbGFzcz0iYiIgZD0iTTcuNDIxLDYuNjc1LDkuNjU3LDQuNTA3VjBIMFY2LjY3NVoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIyLjM4NSAxNS4yOTUpIi8+PHBhdGggY2xhc3M9ImIiIGQ9Ik0wLDQ1VjBINDQuODkyVjMyLjAxOUwzMS45NjcsNDQuOTc1Wk0xOC4yMDgsMTEuMDgzVjMzLjk0MWg0LjJWMjYuMTgySDMxLjU1bDQuNjkzLTQuNTA4aC4wMjVWMTEuMDgzWm0tOS41NTgsMFYzMy45NDFoNC4yVjExLjA4M1oiLz48L2c+PC9zdmc+",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
