"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BrandexLandingPage } from "@/components/landing/BrandexLandingPage";
import { Loader2 } from "lucide-react";

function HomePageContent() {
  const searchParams = useSearchParams();
  const shouldOpenLogin = searchParams?.get("login") === "true";

  return <BrandexLandingPage initialOpenLogin={shouldOpenLogin} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#181817] text-white">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
