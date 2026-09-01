import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, type ExtractedLog, type FoodLog, type Meal, type WorkoutLog, type MeasurementLog } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  onLogged?: () => void;
  placeholder?: string;
}

// Primary chips the user asked for. The extras (post-workout, snack) stay valid via LLM inference.
const PRIMARY_MEALS: Meal[] = ["breakfast", "post-breakfast", "lunch", "pre-workout", "dinner"];
const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  "post-breakfast": "Post breakfast",
  lunch: "Lunch",
  "pre-workout": "Pre workout",
  "post-workout": "Post workout",
  snack: "Snack",
  dinner: "Dinner",
};

/**
 * Universal chat-style logger: text -> LLM parse -> preview -> confirm -> POST.
 * Optional meal_hint chip pre-tags the meal so the parser doesn't have to guess.
 */
export default function QuickLogInput({ onLogged, placeholder }: Props) {
  const [text, setText] = useState("");
  const [mealHint, setMealHint] = useState<Meal | null>(null);
  const [parsed, setParsed] = useState<ExtractedLog | null>(null);
  const qc = useQueryClient();

  const parseMut = useMutation({
    mutationFn: (t: string) => api.parse(t, mealHint),
    onSuccess: (r) => {
      setParsed(r);
      if (r.clarification_needed) {
        toast.info(r.clarification_needed);
      }
    },
    onError: (e: Error) => toast.error(`Parse failed: ${e.message}`),
  });

  const logMut = useMutation({
    mutationFn: async (r: ExtractedLog) => {
      switch (r.log_type) {
        case "food":
          return api.logFood(r.data as unknown as FoodLog);
        case "water":
          return api.logWater(Number((r.data as { water_ml: number }).water_ml));
        case "weight": {
          const d = r.data as { weight_kg: number; notes?: string | null };
          return api.logWeight(Number(d.weight_kg), d.notes ?? null);
        }
        case "measurement":
          return api.logMeasurement(r.data as unknown as MeasurementLog);
        case "activity":
          return api.logActivity(r.data as never);
        case "workout":
          return api.logWorkout(r.data as unknown as WorkoutLog);
        case "craving":
          return api.logCraving(r.data as never);
        case "treat":
          return api.logTreat(r.data as never);
        case "recovery":
          return api.logRecovery(r.data as never);
        default:
          throw new Error("Unknown log type — please rephrase.");
      }
    },
    onSuccess: () => {
      toast.success(`Logged as ${parsed?.log_type}`);
      setText("");
      setParsed(null);
      setMealHint(null);
      qc.invalidateQueries();
      onLogged?.();
    },
    onError: (e: Error) => toast.error(`Log failed: ${e.message}`),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRIMARY_MEALS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMealHint(mealHint === m ? null : m)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              mealHint === m
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {MEAL_LABEL[m]}
          </button>
        ))}
        {mealHint && (
          <button
            type="button"
            onClick={() => setMealHint(null)}
            className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            placeholder ??
            "Say anything: '2 idlis and sambar', '750ml water', 'weight 61.4', '3x10 goblet squat @ 20kg'..."
          }
          className="min-h-[96px] flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) {
              e.preventDefault();
              parseMut.mutate(text);
            }
          }}
        />
        <Button
          onClick={() => parseMut.mutate(text)}
          disabled={!text.trim() || parseMut.isPending}
          className="h-11 w-full sm:h-auto sm:w-auto sm:self-start"
        >
          {parseMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Parse
        </Button>
      </div>

      {parsed && (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={parsed.log_type === "unknown" ? "destructive" : "default"}>
                  {parsed.log_type}
                </Badge>
                <span className="text-xs text-muted-foreground">{parsed.reasoning}</span>
              </div>
              <Button
                size="sm"
                onClick={() => logMut.mutate(parsed)}
                disabled={parsed.log_type === "unknown" || logMut.isPending}
              >
                {logMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Log it
              </Button>
            </div>
            {parsed.clarification_needed && (
              <p className="text-sm text-amber-500">? {parsed.clarification_needed}</p>
            )}
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(parsed.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
