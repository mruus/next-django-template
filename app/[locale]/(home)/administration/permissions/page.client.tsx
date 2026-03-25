"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "../../components/table";
import { PermissionsColumns } from "./components/columns";
import { useTablePagination } from "@/lib/table";
import { listUsersWithPermissionsAction } from "@/actions/core/permissions";
import { Users, Key, RefreshCw } from "lucide-react";
import { Link } from "@/lib/navigation";

function PermissionsPage() {
  const t = useTranslations("administration.permissions");
  const commonT = useTranslations("common");
  const { page, pageSize, handlePageChange, handlePageSizeChange } =
    useTablePagination("permissions");

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ["permissions", page, pageSize],
    queryFn: () => listUsersWithPermissionsAction(page, pageSize),
  });

  const data = permissionsData?.data?.message?.data || [];
  const total = permissionsData?.data?.message?.count || 0;

  return (
    <>
      <DataTable
        columns={PermissionsColumns(t, commonT)}
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        // actions={
        //   <>
        //     <Button
        //       variant="outline"
        //       className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/30"
        //       asChild
        //     >
        //       <Link href="/administration/permissions/groups">
        //         <Users className="h-4 w-4 mr-2" />
        //         {t("buttons.groups")}
        //       </Link>
        //     </Button>
        //     <Button
        //       variant="outline"
        //       className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-400 dark:text-green-300 dark:hover:bg-green-900/30"
        //       asChild
        //     >
        //       <Link href="/administration/permissions/assign">
        //         <Key className="h-4 w-4 mr-2" />
        //         {t("buttons.assign")}
        //       </Link>
        //     </Button>
        //     <Button
        //       variant="outline"
        //       className="border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:border-purple-400 dark:text-purple-300 dark:hover:bg-purple-900/30"
        //       asChild
        //     >
        //       <Link href="/administration/permissions/sync-menu">
        //         <RefreshCw className="h-4 w-4 mr-2" />
        //         {t("buttons.syncMenu") || "Sync Menu"}
        //       </Link>
        //     </Button>
        //   </>
        // }
      />
    </>
  );
}

export default PermissionsPage;
