import { Security } from "@hugeicons/core-free-icons";
import {
  FileText,
  HelpCircle,
  Home,
  Layout,
  LucideIcon,
  Package,
  PersonStanding,
  Plug,
  Puzzle,
  Users,
  Building,
  Truck,
  Shield,
  Banknote,
  Calculator,
  Briefcase,
  FileSpreadsheet,
  Warehouse,
  Car,
  Sword,
  Package2,
  Fuel,
  Utensils,
  ClipboardList,
  BarChart3,
  Wallet,
  CreditCard,
  Landmark,
  Receipt,
  Building2,
  Settings,
  Headset,
} from "lucide-react";

import { hrefToPermission } from "@/lib/menu-route-permissions";

export type MenuChild = {
  title: string;
  href: string;
  permission?: string;
};

export type MenuItem = {
  title: string;
  iconName: LucideIcon;
  href?: string;
  children?: MenuChild[];
  permission?: string;
};

export type MenuGroup = {
  title: string;
  iconName: LucideIcon;
  items: MenuItem[];
};

export const menuGroups: MenuGroup[] = [
  {
    title: "menu.ciidanka",
    iconName: PersonStanding,
    items: [
      {
        title: "menu.personnel.title",
        iconName: Headset,
        children: [
          {
            title: "menu.personnel.create",
            href: "/personnel/create",
            permission: hrefToPermission["/personnel/create"],
          },
          {
            title: "menu.personnel.list",
            href: "/personnel",
            permission: hrefToPermission["/personnel"],
          },
        ],
      },
      {
        title: "menu.settings.title",
        iconName: Settings,
        children: [
          {
            title: "menu.settings.tribes",
            href: "/settings/tribes",
            permission: hrefToPermission["/settings/tribes"],
          },
          {
            title: "menu.settings.locations",
            href: "/settings/locations",
            permission: hrefToPermission["/settings/locations"],
          },
          {
            title: "menu.settings.labels",
            href: "/settings/labels",
            permission: hrefToPermission["/settings/labels"],
          },
          {
            title: "menu.settings.qualifications",
            href: "/settings/qualifications",
            permission: hrefToPermission["/settings/qualifications"],
          },
          {
            title: "menu.settings.banks",
            href: "/settings/banks",
            permission: hrefToPermission["/settings/banks"],
          },
          {
            title: "menu.settings.battalionTree",
            href: "/settings/battalion-tree",
            permission: hrefToPermission["/settings/battalion-tree"],
          },
          {
            title: "menu.settings.jobTitles",
            href: "/settings/job-titles",
            permission: hrefToPermission["/settings/job-titles"],
          },
          {
            title: "menu.settings.ranks",
            href: "/settings/ranks",
            permission: hrefToPermission["/settings/ranks"],
          },
          {
            title: "menu.settings.payScale",
            href: "/settings/payScale",
            permission: hrefToPermission["/settings/payScale"],
          },
          {
            title: "menu.settings.contractType",
            href: "/settings/contract-types",
            permission: hrefToPermission["/settings/contract-types"],
          },
          {
            title: "menu.settings.allowances",
            href: "/settings/allowances",
            permission: hrefToPermission["/settings/allowances"],
          },
        ],
      },
    ],
  },
  {
    title: "menu.maaliyadda",
    iconName: Banknote,
    items: [
      {
        title: "menu.maaliyadda",
        iconName: Banknote,
      },
    ],
  },
  {
    title: "menu.taakuleynta",
    iconName: Truck,
    items: [
      {
        title: "menu.taakuleynta",
        iconName: Truck,
      },
    ],
  },
  {
    title: "menu.maamulka.title",
    iconName: Users,
    items: [
      {
        title: "menu.maamulka.users",
        iconName: Users,
        href: "/administration/users",
        permission: hrefToPermission["/administration/users"],
      },
      {
        title: "menu.maamulka.title2",
        iconName: Shield,
        children: [
          {
            title: "menu.maamulka.permissions",
            href: "/administration/permissions",
            permission: hrefToPermission["/administration/permissions"],
          },
          {
            title: "menu.maamulka.groups",
            href: "/administration/permissions/groups",
            permission: hrefToPermission["/administration/permissions/groups"],
          },
          {
            title: "menu.maamulka.assign",
            href: "/administration/permissions/assign",
            permission: hrefToPermission["/administration/permissions/assign"],
          },
          {
            title: "menu.maamulka.sync-menu",
            href: "/administration/permissions/sync-menu",
            permission:
              hrefToPermission["/administration/permissions/sync-menu"],
          },
        ],
      },
    ],
  },
];

// Backward compatibility: flatten all menu items for components that expect the old structure
export const menuList: MenuItem[] = menuGroups.flatMap((group) => group.items);
