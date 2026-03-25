import type { Metadata } from "next";

import PageClient from "./page.client";

export const metadata: Metadata = {
  title: "Pay Scale",
};

export default function Page() {
  return <PageClient />;
}

