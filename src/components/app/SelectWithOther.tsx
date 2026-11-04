import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OTHER_OPTION } from "@/lib/universities";

export type Option = { value: string; label: string };

/**
 * A dropdown that always ends with "Other…" which reveals a text field, so a student whose
 * college/major isn't in the catalog can still type it. Value is the stored string either way.
 */
export function SelectWithOther({
  id,
  value,
  options,
  onChange,
  placeholder,
  otherLabel,
  otherPlaceholder,
  disabled,
}: {
  id?: string;
  value: string;
  options: Option[];
  onChange: (stored: string) => void;
  placeholder: string;
  otherLabel: string;
  otherPlaceholder: string;
  disabled?: boolean;
}) {
  const inList = options.some((o) => o.value === value);
  const [otherMode, setOtherMode] = useState(Boolean(value.trim()) && !inList);

  useEffect(() => {
    if (options.some((o) => o.value === value)) setOtherMode(false);
    else if (value.trim()) setOtherMode(true);
  }, [value, options]);

  return (
    <div className="space-y-2">
      <Select
        {...(disabled ? { disabled: true } : {})}
        value={otherMode ? OTHER_OPTION : inList ? value : ""}
        onValueChange={(v) => {
          if (v === OTHER_OPTION) {
            setOtherMode(true);
            if (inList) onChange("");
            return;
          }
          setOtherMode(false);
          onChange(v);
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_OPTION}>{otherLabel}</SelectItem>
        </SelectContent>
      </Select>
      {otherMode && (
        <Input
          maxLength={160}
          placeholder={otherPlaceholder}
          value={inList ? "" : value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
