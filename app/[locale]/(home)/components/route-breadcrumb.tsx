"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/lib/navigation";
import { menuList } from "./menu-list";

function Breadcrumb({ children }: { children: React.ReactNode }) {
  return <nav aria-label="breadcrumb">{children}</nav>;
}

function BreadcrumbList({ children }: { children: React.ReactNode }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {children}
    </ol>
  );
}

function BreadcrumbItem({ children }: { children: React.ReactNode }) {
  return <li className="inline-flex items-center">{children}</li>;
}

function BreadcrumbSeparator() {
  return <span className="mx-1 text-muted-foreground/60">/</span>;
}

function BreadcrumbPage({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

type Crumb = { labelKey: string; href?: string };

function buildCrumbs(currentPath: string): Crumb[] {
  // Try to resolve from menu definitions first
  for (const item of menuList) {
    if (item.href && item.href === currentPath) {
      return [
        ...(item.group ? [{ labelKey: item.group } satisfies Crumb] : []),
        { labelKey: item.title, href: item.href },
      ];
    }

    const matchedChild = item.children?.find((c) => c.href === currentPath);
    if (matchedChild) {
      return [
        ...(item.group ? [{ labelKey: item.group } satisfies Crumb] : []),
        ...(item.href
          ? [{ labelKey: item.title, href: item.href }]
          : [{ labelKey: item.title }]),
        { labelKey: matchedChild.title, href: matchedChild.href },
      ];
    }
  }

  const pathSegmentToKey: Record<string, string> = {
    administration: "menu.maamulka.title",
    permissions: "menu.maamulka.permissions",
    groups: "administration.permissions.groups.title",
  };
  const parts =
    currentPath.split("?")[0]?.split("#")[0]?.split("/")?.filter(Boolean) ?? [];
  const hrefs = parts.map((_, i) => `/${parts.slice(0, i + 1).join("/")}`);
  return parts.map((p, i) => ({
    labelKey: pathSegmentToKey[p] ?? p,
    href: hrefs[i],
  }));
}

export default function RouteBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations();

  const crumbs = React.useMemo(() => buildCrumbs(pathname), [pathname]);
  if (!crumbs.length) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((c, idx) => {
          const isLast = idx === crumbs.length - 1;
          const label = t(c.labelKey);

          return (
            <React.Fragment key={`${c.labelKey}-${c.href ?? "nohref"}-${idx}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : c.href ? (
                  <Link
                    href={c.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                ) : (
                  <span>{label}</span>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
