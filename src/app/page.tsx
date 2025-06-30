"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/strategies");
  }, [router]);

  return (
    <div className="flex min-h-full items-center justify-center bg-white">
      <div className="text-gray-500">Redirecting to strategies...</div>
    </div>
  );
}
