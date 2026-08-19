"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { TimeTracker } from "@/components/ui/TimeTracker";
import { GlobalUndoListener } from "@/components/common/GlobalUndoListener";
import { UndoToastHUD } from "@/components/common/UndoToastHUD";

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session — not shared between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <GlobalUndoListener />
        {children}
        <TimeTracker />
        <UndoToastHUD />
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
