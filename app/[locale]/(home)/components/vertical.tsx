"use client";

import {
  Bell,
  LayoutGrid,
  User,
  LogOut,
  Settings,
  ChevronDown,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeDrawer from "./drawer-theme";
import { menuList, menuGroups } from "./menu-list";
import Image from "next/image";
import { usePathname, Link } from "@/lib/navigation";
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { useAtomValue } from "jotai";
import { isDesktopAtom } from "@/atoms/menu";
import { useTranslations } from "next-intl";
import Logo from "./logo";
import { useSession, signOut } from "next-auth/react";
import Can from "./can";
import { useHasPermission } from "./use-has-permission";

interface VerticalSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function VerticalSidebar({
  open,
  onClose,
}: VerticalSidebarProps) {
  const currentPath = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { theme } = useTheme();
  const isDesktop = useAtomValue(isDesktopAtom);
  const hasPermission = useHasPermission();
  const t = useTranslations();
  const { data: session } = useSession();

  const userName = session?.user?.name || session?.user?.email || "User";
  const userEmail = session?.user?.email || "No email";

  useEffect(() => {
    if (!isDesktop) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, isDesktop]);

  const allowedMenuGroups = useMemo(() => {
    return menuGroups
      .map((group) => {
        const filteredItems = group.items
          .map((item) => {
            if (item.children?.length) {
              if (!hasPermission(item.permission)) {
                return null;
              }

              const filteredChildren = item.children.filter((child) =>
                hasPermission(child.permission),
              );

              if (!filteredChildren.length) {
                return null;
              }

              return {
                ...item,
                children: filteredChildren,
              };
            }

            if (!hasPermission(item.permission)) {
              return null;
            }

            return item;
          })
          .filter(Boolean) as typeof group.items;

        if (!filteredItems.length) {
          return null;
        }

        return {
          ...group,
          items: filteredItems,
        };
      })
      .filter(Boolean) as typeof menuGroups;
  }, [hasPermission]);

  return (
    <>
      {/* MOBILE OVERLAY BACKDROP */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* SIDEBAR — fixed on mobile, static on desktop */}
      <aside
        className={`
          fixed inset-y-0 start-0 z-50
          lg:static lg:inset-auto lg:z-auto
          flex flex-col h-full w-64 shrink-0
          border-e border-border bg-sidebar dark:bg-zinc-900
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:hidden"}
        `}
      >
        {/* LOGO + CLOSE (mobile) */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
          <Logo
            className="h-7 w-auto shrink-0 text-primary"
            // or whatever size you want: h-8, h-9, etc.
          />
          {/* <Image
            src={
              theme === "dark"
                ? "/logos/logo-white.png"
                : "/logos/logo-primary.png"
            }
            alt="logo"
            width={28}
            height={28}
            className="shrink-0"
          /> */}
          <span className="text-base font-bold text-primary">SNA</span>
          <button
            className="ms-auto lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* NAV MENU */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="flex flex-col gap-0.5">
            {allowedMenuGroups.map((group, groupIndex) => (
              <div key={group.title}>
                {/* Group header */}
                <div className="px-3 pt-4 pb-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    <group.iconName size={12} strokeWidth={1.5} />
                    {t(group.title)}
                  </div>
                </div>
                {/* Group menu items */}
                {group.items.map((menuItem) => {
                  const IconComponent = menuItem.iconName;
                  const isActive =
                    menuItem.href === currentPath ||
                    menuItem.children?.some((c) => c.href === currentPath);
                  const isOpen = openMenu === menuItem.title;

                  return (
                    <li key={menuItem.title}>
                      <Link
                        href={menuItem.children ? "#" : menuItem.href || "#"}
                        onClick={
                          menuItem.children
                            ? (e) => {
                                e.preventDefault();
                                setOpenMenu(isOpen ? null : menuItem.title);
                              }
                            : undefined
                        }
                        className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                          isActive
                            ? "text-primary bg-primary/10 dark:bg-primary/20"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
                        }`}
                      >
                        <IconComponent
                          size={16}
                          strokeWidth={1.5}
                          className="shrink-0"
                        />
                        <span className="flex-1">{t(menuItem.title)}</span>
                        {menuItem.children && (
                          <ChevronDown
                            size={14}
                            strokeWidth={1.5}
                            className={`transition-transform rtl:rotate-180 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </Link>
                      {menuItem.children && isOpen && (
                        <div className="ms-4 mt-0.5 mb-1 flex flex-col gap-0.5 border-s border-border ps-3">
                          {menuItem.children.map((child) => (
                            <Can key={child.title} permission={child.permission}>
                              <Link
                                href={child.href}
                                className={`px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors ${
                                  child.href === currentPath
                                    ? "text-primary bg-primary/10 dark:bg-primary/20"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {t(child.title)}
                              </Link>
                            </Can>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </div>
            ))}
          </ul>
        </nav>

        {/* BOTTOM: THEME + PROFILE */}
        <div className="border-t border-sidebar-border">
          <div className="px-2 py-2">
            <ThemeDrawer />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <User size={16} className="text-muted-foreground" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {userName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="me-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="me-2 h-4 w-4" />
                <span>Notifications</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LayoutGrid className="me-2 h-4 w-4" />
                <span>Apps</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="me-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="me-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
