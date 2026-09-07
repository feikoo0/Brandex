"use client";

import React, { Suspense } from "react";
import { useRouter } from "next/navigation";
import { TaskiStepRegister } from "@/components/onboarding/TaskiStepRegister";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#181817] text-white">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      }
    >
      <TaskiStepRegister
        stepperPosition="left"
        onClose={() => router.push("/")}
        onSuccess={() => router.push("/taski")}
      />
    </Suspense>
  );
}
