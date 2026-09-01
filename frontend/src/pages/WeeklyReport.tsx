import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtNum } from "@/lib/utils";

function mondayISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export default function WeeklyReport() {
  const [weekStart, setWeekStart] = useState(mondayISO());
  const q = useQuery({
    queryKey: ["weekly", weekStart],
    queryFn: () => api.weeklyReport(weekStart),
    enabled: false,
  });
  const gen = useMutation({
    mutationFn: () => api.weeklyReport(weekStart),
    onSuccess: () => {
      q.refetch();
      toast.success("Report generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = (gen.data ?? q.data) as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Weekly Report</h1>
        <p className="text-sm text-muted-foreground">Aggregates + one recommendation. No panic over a single day.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Week starting (Mon)</label>
          <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        </div>
        <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
          {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate report
        </Button>
      </div>

      {data && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Stat title="Avg weight" value={fmtNum(data.avg_weight_kg as number | null, 2)} unit="kg" />
            <Stat
              title="Change vs prev"
              value={fmtNum(data.weight_change_kg as number | null, 2)}
              unit="kg"
              trend={(data.weight_change_kg as number | null) ?? undefined}
            />
            <Stat title="Avg protein" value={fmtNum(data.avg_protein_g as number | null, 0)} unit="g" />
            <Stat title="Avg calories" value={fmtNum(data.avg_calories as number | null, 0)} unit="kcal" />
            <Stat title="Workouts" value={String(data.workouts_completed as number)} unit="sessions" />
            <Stat title="Avg steps" value={fmtNum(data.avg_steps as number | null, 0)} unit="/day" />
            <Stat title="PRs hit" value={String(data.prs_hit as number)} unit="" />
            <Stat title="Treats" value={String(data.treat_meals as number)} unit="meals" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Coach take</CardTitle>
              <CardDescription>Generated fresh; not medical advice.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {(data.recommendation as string) || "—"}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ title, value, unit, trend }: { title: string; value: string; unit: string; trend?: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="mt-1 flex items-baseline gap-2 text-2xl font-bold">
          {value}
          <span className="text-sm text-muted-foreground">{unit}</span>
          {trend !== undefined && trend !== null && (
            <span className="flex items-center text-sm">
              {trend < 0 ? <ArrowDown className="h-4 w-4 text-success" /> : trend > 0 ? <ArrowUp className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
