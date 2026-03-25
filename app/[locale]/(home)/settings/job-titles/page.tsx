import type { Metadata } from "next";

import PageClient from "./page.client";

export const metadata: Metadata = {
  title: "Job Titles",
};

export default function Page() {
  return <PageClient />;
}

