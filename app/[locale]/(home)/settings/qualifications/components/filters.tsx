"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

import { type QualificationType } from "./qualification-types";

interface QualificationFiltersProps {
  nameQuery: string;
  typeFilter: QualificationType | "";
  onSearchChange: (nameQuery: string, typeFilter: QualificationType | "") => void;
  onSearchReset: () => void;
}

export default function QualificationFilters({
  nameQuery,
  typeFilter,
  onSearchChange,
  onSearchReset,
}: QualificationFiltersProps) {
  const t = useTranslations("settings.qualifications");
  const commonT = useTranslations("common");
  const [localNameQuery, setLocalNameQuery] = useState(nameQuery);
  const [localTypeFilter, setLocalTypeFilter] = useState(typeFilter);

  const handleSearch = () => {
    onSearchChange(localNameQuery, localTypeFilter);
  };

  const handleReset = () => {
    setLocalNameQuery("");
    setLocalTypeFilter("");
    onSearchReset();
  };

  const hasActiveFilters = !!localNameQuery.trim() || !!localTypeFilter;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select
            value={localTypeFilter}
            onValueChange={(value) =>
              setLocalTypeFilter(value as QualificationType | "")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={commonT("type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="education">{t("education")}</SelectItem>
              <SelectItem value="skill">{t("skill")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Input
            type="text"
            placeholder={commonT("filters.enterKeyword")}
            value={localNameQuery}
            onChange={(e) => setLocalNameQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSearch} disabled={!hasActiveFilters} className="gap-2">
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

