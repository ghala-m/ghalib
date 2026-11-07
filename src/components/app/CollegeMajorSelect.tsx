import { useMemo } from "react";
import { ReportCatalogIssue } from "@/components/app/ReportCatalogIssue";
import { Label } from "@/components/ui/label";
import { SelectWithOther } from "@/components/app/SelectWithOther";
import { useI18n } from "@/lib/i18n";
import { collegesForUniversity, majorsForCollege } from "@/lib/universities";

/**
 * Levels 2 and 3 of University > College > Major. The college list depends on the university and
 * the major list on the college; changing a parent clears the child if it no longer applies.
 */
export function CollegeMajorSelect({
  university,
  college,
  major,
  onChange,
  idPrefix = "cm",
}: {
  university: string;
  college: string;
  major: string;
  onChange: (next: { college: string; major: string }) => void;
  idPrefix?: string;
}) {
  const { t, lang } = useI18n();
  const colleges = useMemo(() => collegesForUniversity(university), [university]);
  const majors = useMemo(() => majorsForCollege(university, college), [university, college]);
  const noUniversity = !university.trim();

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-college`}>{t("collegeField")}</Label>
        <SelectWithOther
          id={`${idPrefix}-college`}
          value={college}
          disabled={noUniversity}
          options={colleges.map((c) => ({ value: c.ar, label: c[lang] }))}
          placeholder={noUniversity ? t("pickUniversityFirst") : t("pickCollege")}
          otherLabel={t("otherCollege")}
          otherPlaceholder={t("collegeNamePlaceholder")}
          onChange={(v) => onChange({ college: v, major: v === college ? major : "" })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-major`}>{t("major")}</Label>
        <SelectWithOther
          id={`${idPrefix}-major`}
          value={major}
          disabled={noUniversity || !college.trim()}
          options={majors.map((m) => ({ value: m.en, label: m[lang] }))}
          placeholder={!college.trim() ? t("pickCollegeFirst") : t("pickMajor")}
          otherLabel={t("otherMajor")}
          otherPlaceholder={t("majorNamePlaceholder")}
          onChange={(v) => onChange({ college, major: v })}
        />
      </div>
      <ReportCatalogIssue university={university} college={college} major={major} />
    </>
  );
}
