import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { OTHER_UNIVERSITY, UNIVERSITIES, findUniversity } from "@/lib/universities";

/**
 * University picker shared by onboarding and settings. Catalog universities are stored by their
 * stable official name; "Other" reveals a free-text field for a university that isn't listed.
 *
 * `onChange` fires immediately for catalog picks. For the free-text case it fires per keystroke,
 * unless `commitLabel` is given — then a button commits it (used by settings, where each change
 * needs a confirmation).
 */
export function UniversitySelect({
  id,
  value,
  onChange,
  commitLabel,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (stored: string) => void;
  commitLabel?: string;
  disabled?: boolean;
}) {
  const { t, lang } = useI18n();
  const known = findUniversity(value);
  const [otherMode, setOtherMode] = useState(Boolean(value.trim()) && !known);
  const [custom, setCustom] = useState(known ? "" : value);

  useEffect(() => {
    const k = findUniversity(value);
    if (k) {
      setOtherMode(false);
    } else if (value.trim()) {
      setOtherMode(true);
      setCustom(value);
    }
  }, [value]);

  const selectValue = otherMode ? OTHER_UNIVERSITY : (known?.official ?? "");

  return (
    <div className="space-y-2">
      <Select
        {...(disabled ? { disabled: true } : {})}
        value={selectValue}
        onValueChange={(v) => {
          if (v === OTHER_UNIVERSITY) {
            setOtherMode(true);
            return;
          }
          setOtherMode(false);
          onChange(v);
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={t("pickUniversity")} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {UNIVERSITIES.map((u) => (
            <SelectItem key={u.official} value={u.official}>
              {u[lang]}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_UNIVERSITY}>{t("otherUniversity")}</SelectItem>
        </SelectContent>
      </Select>
      {otherMode && (
        <div className="flex gap-2">
          <Input
            maxLength={160}
            disabled={disabled}
            placeholder={t("universityNamePlaceholder")}
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              if (!commitLabel) onChange(e.target.value);
            }}
          />
          {commitLabel && (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || !custom.trim() || custom.trim() === value.trim()}
              onClick={() => onChange(custom.trim())}
            >
              {commitLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
