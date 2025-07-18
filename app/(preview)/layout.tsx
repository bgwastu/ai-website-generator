"use client";

import { Toaster } from "sonner";
import "./globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <html lang="en">
      <body>
        <Toaster position="top-center" richColors />
        <QueryClientProvider client={queryClient}>
          <Suspense>
            <NuqsAdapter>{children}</NuqsAdapter>
          </Suspense>
        </QueryClientProvider>
      </body>
    </html>
  );
}
