import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { termsQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";

export function GpaTrendChart() {
  const { t } = useI18n();
  const { data: terms = [] } = useQuery(termsQuery());

  const data = useMemo(
    () =>
      terms
        .filter((term) => term.gpa != null)
        .sort((a, b) => a.term_number - b.term_number)
        .map((term) => ({ name: term.name, gpa: Number(term.gpa) })),
    [terms],
  );

  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <TrendingUp className="size-4 text-accent" />
        {t("gpaTrend")}
      </h2>
      {data.length < 2 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("gpaTrendEmpty")}</p>
      ) : (
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="gpa"
                stroke="hsl(var(--accent))"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
