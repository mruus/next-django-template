"use client";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/lotties/sna.json";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-40 h-40">
        {" "}
        {/* Adjust size as needed */}
        <Lottie
          animationData={loadingAnimation}
          loop={true}
          autoplay={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <p className="mt-6 text-lg font-medium text-muted-foreground">
        Loading...
      </p>
    </div>
  );
}
