import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { coursesQuery, termsQuery } from "@/lib/queries";
import { deriveTermHistory } from "@/lib/gpa";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function GpaTrendChart() {
  const { t } = useI18n();
  const { data: terms = [] } = useQuery(termsQuery());
  const { data: courses = [] } = useQuery(coursesQuery());

  const history = useMemo(() => deriveTermHistory(courses, terms), [courses, terms]);

  const data = useMemo(() => {
    let cumCredits = 0;
    let cumPoints = 0;
    return history
      .filter((h) => h.gpa != null)
      .map((h) => {
        cumCredits += h.credits;
        cumPoints += Number(h.gpa) * h.credits;
        const name = !h.label
          ? t("noTerm")
          : /^\d+$/.test(h.label)
            ? `${t("termLabel")} ${h.label}`
            : h.label;
        return {
          name,
          gpa: Number(Number(h.gpa).toFixed(2)),
          cgpa: cumCredits ? Number((cumPoints / cumCredits).toFixed(2)) : null,
        };
      });
  }, [history, t]);

  // Previously this only warned when almost nothing could be plotted (`data.length < 2`), so a
  // case like hers — 3 terms exist, but only 2 have a recorded GPA — rendered a normal-looking
  // 2-point chart with the missing term just silently absent, no indication anything was left
  // out. Comparing against `history.length` catches *any* gap, not just a near-total one.
  const missingCount = history.length - data.length;
  const hasMissingData = missingCount > 0 && data.length < 2;
  const hasPartialGap = missingCount > 0 && data.length >= 2;

  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <TrendingUp className="size-4 text-accent" />
        {t("gpaTrend")}
      </h2>
      {data.length < 2 ? (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">
            {hasMissingData ? t("gpaTrendMissingData") : t("gpaTrendEmpty")}
          </p>
          {hasMissingData ? (
            <Button size="sm" variant="outline" className="mt-3" asChild>
              <Link to="/profile" hash="gpa-history">
                {t("gpaTrendAddData")}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4">
          {hasPartialGap ? (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span>{t("gpaTrendPartialGap").replace("{count}", String(missingCount))}</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" asChild>
                <Link to="/profile" hash="gpa-history">
                  {t("gpaTrendAddData")}
                </Link>
              </Button>
            </div>
          ) : null}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 14, right: 16, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 4]}
                  ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 4 }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
                  formatter={(value) => (value === "gpa" ? t("termGpa") : t("cgpa"))}
                />
                <Line
                  type="monotone"
                  dataKey="gpa"
                  name="gpa"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--accent)", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                >
                  <Label position="top" fontSize={11} fill="var(--accent)" offset={10} />
                </Line>
                <Line
                  type="monotone"
                  dataKey="cgpa"
                  name="cgpa"
                  stroke="var(--chart-3, var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--chart-3, var(--primary))", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                >
                  <Label
                    position="bottom"
                    fontSize={11}
                    fill="var(--chart-3, var(--primary))"
                    offset={10}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
