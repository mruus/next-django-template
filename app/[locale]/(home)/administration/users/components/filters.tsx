"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface UserFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchReset: () => void;
}

export default function UserFilters({
  searchQuery,
  onSearchChange,
  onSearchReset,
}: UserFiltersProps) {
  const commonT = useTranslations("common");
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearch = () => onSearchChange(localQuery);
  const handleReset = () => {
    setLocalQuery("");
    onSearchReset();
  };
  const hasActiveFilters = !!localQuery.trim();

  return (
    <div className="flex gap-3">
      <div className="flex-1 max-w-sm">
        <Input
          type="text"
          placeholder={commonT("filters.enterKeyword")}
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleSearch}
          disabled={!hasActiveFilters}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          {commonT("filters.search")}
        </Button>
        {hasActiveFilters && (
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <X className="h-4 w-4" />
            {commonT("filters.clear")}
          </Button>
        )}
      </div>
    </div>
  );
}
