"use client";

import {
  Bell,
  LayoutGrid,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
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
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import Logo from "./logo";
import { useSession, signOut } from "next-auth/react";
import Can from "./can";
import { useHasPermission } from "./use-has-permission";

export default function HorizontalHeader() {
  const currentPath = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const { theme } = useTheme();
  const t = useTranslations();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const { data: session } = useSession();
  const hasPermission = useHasPermission();

  const userName = session?.user?.name || session?.user?.email || "User";
  const userEmail = session?.user?.email || "No email";

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

  const groups = useMemo(
    () => allowedMenuGroups.map((group) => group.title),
    [allowedMenuGroups],
  );

  const menuItemsForActiveGroup = activeGroup
    ? allowedMenuGroups.find((group) => group.title === activeGroup)?.items || []
    : allowedMenuGroups[0]?.items || [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize group from storage / fallback to first group
  useEffect(() => {
    const stored = window.localStorage.getItem("sna-horizontal-active-group");
    if (stored && groups.includes(stored)) {
      setActiveGroup(stored);
      return;
    }
    setActiveGroup(groups[0] ?? null);
  }, [groups]);

  // Persist group selection
  useEffect(() => {
    if (!activeGroup) return;
    window.localStorage.setItem("sna-horizontal-active-group", activeGroup);
  }, [activeGroup]);

  // Auto-select the group for the active route - DISABLED (doesn't work with new menu structure)
  // useEffect(() => {
  //   const matched = menuList.find(
  //     (item) =>
  //       item.href === currentPath ||
  //       item.children?.some((child) => child.href === currentPath),
  //   );
  //   if (matched?.group && groups.includes(matched.group)) {
  //     if (activeGroup !== matched.group) setActiveGroup(matched.group);
  //   }
  // }, [currentPath, groups, activeGroup]);

  // Ensure we always have a valid group when groups exist
  useEffect(() => {
    if (groups.length === 0) return;
    if (!activeGroup || !groups.includes(activeGroup)) {
      setActiveGroup(groups[0]);
    }
  }, [groups, activeGroup]);

  // Close open menus when switching groups
  useEffect(() => {
    setOpenMenu(null);
  }, [activeGroup]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setMobileSubmenu(null);
  }, [currentPath]);

  return (
    <div className="w-full flex flex-col">
      {/* TOP HEADER */}
      <div className="border-b border-border bg-card dark:bg-zinc-900 flex justify-between items-center py-2 px-4 lg:px-45.5 h-15">
        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Logo className="h-7 w-auto shrink-0 text-primary" />
          {/* <Image
            src={theme === "dark" ? "/logos/logo-white.png" : "/logos/logo-primary.png"}
            alt="logo"
            width={32}
            height={32}
          /> */}
          <span className="text-lg font-bold text-primary">SNA</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Bell size={18} />
          </button>

          <button className="hidden sm:block text-muted-foreground hover:text-foreground transition-colors">
            <LayoutGrid size={18} />
          </button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-muted rounded-lg p-1 transition-colors">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                  <User size={16} className="text-muted-foreground" />
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">
                    {userName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {userEmail}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="me-2 h-4 w-4" />
                <span>Profile</span>
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
      </div>

      {/* DESKTOP GROUPS SECTION */}
      <div className="hidden lg:flex h-11 border-b border-border bg-card dark:bg-zinc-900 items-center px-45.5">
        <div className="flex items-center gap-2">
          {allowedMenuGroups.map((group) => {
            const isSelected = activeGroup === group.title;
            return (
              <button
                key={group.title}
                type="button"
                onClick={() => setActiveGroup(group.title)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isSelected
                    ? "text-primary bg-primary/10 dark:bg-primary/20"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
                }`}
              >
                <group.iconName size={16} strokeWidth={1.5} />
                {t(group.title)}
              </button>
            );
          })}
        </div>
      </div>

      {/* DESKTOP MENU SECTION */}
      <div className="hidden lg:flex h-13 border-b border-border bg-card dark:bg-zinc-900 items-stretch justify-between px-45.5">
        <nav ref={navRef} className="h-full">
          <ul className="flex h-full items-stretch gap-1">
            {menuItemsForActiveGroup.map((menuItem) => {
              const IconComponent = menuItem.iconName;
              const isActive =
                menuItem.href === currentPath ||
                menuItem.children?.some((child) => child.href === currentPath);
              const isOpen = openMenu === menuItem.title;

              return (
                <li
                  key={menuItem.title}
                  className={`relative flex items-center ${isActive ? "border-b-2 border-primary" : ""}`}
                >
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
                    className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors cursor-pointer rounded-md ${isActive ? "text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20"}`}
                  >
                    <IconComponent size={16} strokeWidth={1.5} />
                    {t(menuItem.title)}
                    {menuItem.children && (
                      <ChevronDown
                        size={14}
                        strokeWidth={1.5}
                        className={`ms-1 transition-transform rtl:rotate-180 ${isOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </Link>
                  {menuItem.children && isOpen && (
                    <div className="absolute start-0 top-full z-50 bg-popover text-popover-foreground shadow-lg border border-border rounded-md mt-1 p-1 w-max min-w-40">
                      {menuItem.children.map((child) => (
                        <Can key={child.title} permission={child.permission}>
                          <Link
                            href={child.href}
                            onClick={() => setOpenMenu(null)}
                            className={`block px-4 py-2 text-sm rounded-md hover:bg-muted ${child.href === currentPath ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-muted-foreground"}`}
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
          </ul>
        </nav>
        <ThemeDrawer />
      </div>

      {/* MOBILE MENU DRAWER */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-border bg-card dark:bg-zinc-900">
          <nav className="px-4 py-2 flex flex-col">
            {allowedMenuGroups.map((group) => (
              <div key={group.title} className="mb-2">
                <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground">
                  <group.iconName size={16} strokeWidth={1.5} />
                  {t(group.title)}
                </div>
                <div className="ms-6">
                  {group.items.map((menuItem) => {
                    const IconComponent = menuItem.iconName;
                    const isActive =
                      menuItem.href === currentPath ||
                      menuItem.children?.some(
                        (child) => child.href === currentPath,
                      );
                    const isExpanded = mobileSubmenu === menuItem.title;

                    return (
                      <div key={menuItem.title}>
                        <a
                          href={
                            menuItem.children ? undefined : menuItem.href || "#"
                          }
                          onClick={
                            menuItem.children
                              ? (e: ReactMouseEvent<HTMLAnchorElement>) => {
                                  e.preventDefault();
                                  setMobileSubmenu(
                                    isExpanded ? null : menuItem.title,
                                  );
                                }
                              : undefined
                          }
                          className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${isActive ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20"}`}
                        >
                          <span className="flex items-center gap-2">
                            <IconComponent size={16} strokeWidth={1.5} />
                            {t(menuItem.title)}
                          </span>
                          {menuItem.children && (
                            <ChevronDown
                              size={14}
                              strokeWidth={1.5}
                              className={`transition-transform rtl:rotate-180 ${isExpanded ? "rotate-180" : ""}`}
                            />
                          )}
                        </a>
                        {menuItem.children && isExpanded && (
                          <div className="ms-6 mb-1 flex flex-col">
                            {menuItem.children.map((child) => (
                              <Can key={child.title} permission={child.permission}>
                                <a
                                  href={child.href}
                                  className={`px-3 py-2 text-sm rounded-md hover:bg-muted ${child.href === currentPath ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-muted-foreground"}`}
                                >
                                  {t(child.title)}
                                </a>
                              </Can>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="pt-1 pb-2">
              <ThemeDrawer />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
