import type React from "react";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Streak Tracker",
  description: "Set a goal and track your daily habits and streaks.",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
      <body>
        <ThemeProvider defaultTheme="dark" attribute="class">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
