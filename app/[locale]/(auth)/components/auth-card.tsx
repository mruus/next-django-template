"use client";

import Logo from "@/app/[locale]/(home)/components/logo";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function AuthCard({
  title,
  description,
  children,
}: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-auto text-primary shrink-0" />
            <span className="text-xl font-bold text-primary tracking-tight">
              SNA
            </span>
          </div>
          <div className="text-center">
            <CardTitle className="text-xl font-semibold text-start">{title}</CardTitle>
            <CardDescription className="mt-1 text-start">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
