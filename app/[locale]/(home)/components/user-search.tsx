"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { searchUsersAction, type UserSearchHit } from "@/actions/core/users";

export type { UserSearchHit };

type UserSearchProps = {
  selectedUser: UserSearchHit | null;
  onSelectUser: (user: UserSearchHit) => void;
  onClear?: () => void;
  minChars?: number;
  className?: string;
};

export function UserSearch({
  selectedUser,
  onSelectUser,
  onClear,
  minChars = 2,
  className,
}: UserSearchProps) {
  const t = useTranslations("administration.permissions.assign");
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(input.trim()), 300);
    return () => clearTimeout(tmr);
  }, [input]);

  const canQuery = debounced.length >= minChars;

  const { data, isFetching } = useQuery({
    queryKey: ["users-search", debounced],
    queryFn: async () => {
      const result = await searchUsersAction(debounced, 25);
      if (!result.success || result.data?.error) {
        throw new Error("Search failed");
      }
      return result.data?.message.users ?? [];
    },
    enabled: canQuery,
  });

  const users = data ?? [];

  const handlePick = useCallback(
    (u: UserSearchHit) => {
      onSelectUser(u);
      setInput("");
      setDebounced("");
    },
    [onSelectUser],
  );

  const summary = useMemo(() => {
    if (!selectedUser) return null;
    const name = [selectedUser.first_name, selectedUser.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || selectedUser.username;
  }, [selectedUser]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="ps-9"
            disabled={Boolean(selectedUser)}
          />
        </div>
        {selectedUser && onClear && (
          <Button type="button" variant="outline" onClick={onClear}>
            {t("clearUser")}
          </Button>
        )}
      </div>
      {!selectedUser && input.trim().length > 0 && input.trim().length < minChars && (
        <p className="text-xs text-muted-foreground">{t("searchMinChars")}</p>
      )}
      {!selectedUser && canQuery && (
        <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/30">
          {isFetching && (
            <div className="p-3 text-sm text-muted-foreground">{t("searching")}</div>
          )}
          {!isFetching && users.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">{t("noResults")}</div>
          )}
          {!isFetching &&
            users.map((u) => (
              <button
                key={u.id}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-start text-sm last:border-b-0 hover:bg-muted/60"
                onClick={() => handlePick(u)}
              >
                <span className="font-medium">
                  {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.username}
                </span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
                <span className="text-xs text-muted-foreground">@{u.username}</span>
              </button>
            ))}
        </div>
      )}
      {selectedUser && summary && (
        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
          <div className="font-medium">{summary}</div>
          <div className="text-muted-foreground">{selectedUser.email}</div>
        </div>
      )}
    </div>
  );
}
