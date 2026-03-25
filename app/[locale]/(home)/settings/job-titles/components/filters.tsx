"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface JobTitlesFiltersProps {
  nameQuery: string;
  onSearchChange: (nameQuery: string) => void;
  onSearchReset: () => void;
}

export default function JobTitlesFilters({
  nameQuery,
  onSearchChange,
  onSearchReset,
}: JobTitlesFiltersProps) {
  const commonT = useTranslations("common");
  const [localNameQuery, setLocalNameQuery] = useState(nameQuery);

  const handleSearch = () => {
    onSearchChange(localNameQuery);
  };

  const handleReset = () => {
    setLocalNameQuery("");
    onSearchReset();
  };

  const hasActiveFilters = !!localNameQuery.trim();

  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <Input
          type="text"
          placeholder={commonT("filters.enterKeyword")}
          value={localNameQuery}
          onChange={(e) => setLocalNameQuery(e.target.value)}
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
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            {commonT("filters.clear")}
          </Button>
        )}
      </div>
    </div>
  );
}

