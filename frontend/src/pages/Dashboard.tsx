import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Droplets, Flame, Footprints, Minus, Wheat } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtNum, pct } from "@/lib/utils";
import QuickLogInput from "@/components/QuickLogInput";

export default function Dashboard() {
  const daily = useQuery({ queryKey: ["daily"], queryFn: () => api.daily() });
  const trend = useQuery({ queryKey: ["weightTrend", 60], queryFn: () => api.weightTrend(60) });

  const d = daily.data;
  const t = trend.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">
            {daily.data ? new Date(daily.data.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "\u00a0"}
          </p>
        </div>
        {d && (
          <Badge variant={d.adherence.score >= 80 ? "success" : d.adherence.score >= 60 ? "default" : "muted"}>
            Adherence {d.adherence.score}%
          </Badge>
        )}
      </div>

      <QuickLogInput />

      {/* Weight — the big number, using 7-day average */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Weight — 7 day average</CardTitle>
          <CardDescription>Don't panic over daily swings. This is what actually matters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-4">
            <div className="text-4xl font-bold">
              {fmtNum(t?.current_7day_avg ?? null, 2)}
              <span className="ml-1 text-lg text-muted-foreground">kg</span>
            </div>
            {t?.change_kg !== null && t?.change_kg !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                {t.change_kg < 0 ? (
                  <ArrowDown className="h-4 w-4 text-success" />
                ) : t.change_kg > 0 ? (
                  <ArrowUp className="h-4 w-4 text-destructive" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={t.change_kg < 0 ? "text-success" : t.change_kg > 0 ? "text-destructive" : ""}>
                  {t.change_kg > 0 ? "+" : ""}
                  {fmtNum(t.change_kg, 2)} kg vs previous week
                </span>
              </div>
            )}
          </div>

          <div className="h-40 w-full">
            {t?.series && t.series.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={t.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    domain={["dataMin - 0.5", "dataMax + 0.5"]}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: 12,
                    }}
                    labelFormatter={fmtDate}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Daily"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="rolling_7"
                    name="7-day avg"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Log your weight to see the trend.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today totals grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Protein"
          value={`${fmtNum(d?.protein_g ?? 0, 0)} g`}
          target={d?.targets.protein_g ?? null}
          progress={pct(d?.protein_g ?? 0, d?.targets.protein_g)}
          hint={
            d && d.targets.protein_g
              ? `${d.targets.protein_g - d.protein_g > 0 ? Math.round(d.targets.protein_g - d.protein_g) : 0} g to go`
              : "Set target in Profile"
          }
        />
        <MetricCard
          title="Calories in"
          icon={<Flame className="h-4 w-4" />}
          value={`${fmtNum(d?.calories_in ?? 0, 0)}`}
          target={d?.targets.calorie_target ?? null}
          progress={pct(d?.calories_in ?? 0, d?.targets.calorie_target)}
          hint={
            d?.calories_burned
              ? `Net: ${Math.round((d.calories_in ?? 0) - (d.calories_burned ?? 0))}`
              : ""
          }
        />
        <MetricCard
          title="Steps"
          icon={<Footprints className="h-4 w-4" />}
          value={fmtNum(d?.steps ?? 0, 0)}
          target={d?.targets.steps ?? null}
          progress={pct(d?.steps ?? 0, d?.targets.steps)}
        />
        <MetricCard
          title="Water"
          icon={<Droplets className="h-4 w-4" />}
          value={`${((d?.water_ml ?? 0) / 1000).toFixed(1)} L`}
          target={d?.targets.water_ml ? `${(d.targets.water_ml / 1000).toFixed(1)} L` : null}
          progress={pct(d?.water_ml ?? 0, d?.targets.water_ml)}
        />
      </div>

      {/* Macro breakdown + workout */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Wheat className="h-4 w-4" /> Macros today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-3 gap-2 text-center text-sm">
              <li>
                <div className="text-lg font-semibold">{fmtNum(d?.carbs_g ?? 0, 0)}</div>
                <div className="text-xs text-muted-foreground">Carbs g</div>
              </li>
              <li>
                <div className="text-lg font-semibold">{fmtNum(d?.fat_g ?? 0, 0)}</div>
                <div className="text-xs text-muted-foreground">Fat g</div>
              </li>
              <li>
                <div className="text-lg font-semibold">{fmtNum(d?.fibre_g ?? 0, 0)}</div>
                <div className="text-xs text-muted-foreground">Fibre g</div>
              </li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Workout</CardTitle>
          </CardHeader>
          <CardContent>
            {d?.workout_done ? (
              <div className="text-sm">
                <Badge variant="success">Done</Badge>
                <span className="ml-2 text-muted-foreground">{d.workout_sets} sets logged today.</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No workout logged yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  target,
  progress,
  hint,
  icon,
}: {
  title: string;
  value: string;
  target: number | string | null;
  progress: number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {target !== null && (
            <div className="text-sm text-muted-foreground">of {typeof target === "number" ? fmtNum(target, 0) : target}</div>
          )}
        </div>
        <Progress value={progress} />
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
