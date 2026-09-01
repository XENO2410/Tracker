import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Plus, Trash2, Trophy } from "lucide-react";
import { api, type WorkoutExercise, type WorkoutLog, type WorkoutSet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fmtDate, todayISO } from "@/lib/utils";

function newSet(n: number): WorkoutSet {
  return { set_number: n, weight_kg: null, reps: 8, rir: 2, is_bodyweight: false };
}
function newExercise(name = ""): WorkoutExercise {
  return { exercise: name, sets: [newSet(1)] };
}

export default function Workouts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workouts</h1>
        <p className="text-sm text-muted-foreground">
          Track sets, reps, and progression. PRs are detected automatically.
        </p>
      </div>
      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Log session</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="prs">PRs</TabsTrigger>
        </TabsList>
        <TabsContent value="log">
          <LogSession />
        </TabsContent>
        <TabsContent value="history">
          <History />
        </TabsContent>
        <TabsContent value="prs">
          <PRs />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LogSession() {
  const [date, setDate] = useState(todayISO());
  const [split, setSplit] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([newExercise()]);
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: (body: WorkoutLog) => api.logWorkout(body),
    onSuccess: (r) => {
      toast.success(`Logged ${r.sets_logged} sets.`);
      setExercises([newExercise()]);
      setNotes("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label className="mb-1 block">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block">Split</Label>
          <Input placeholder="Push / Pull / Legs / Upper..." value={split} onChange={(e) => setSplit(e.target.value)} />
        </div>
        <div className="flex items-end text-sm text-muted-foreground">
          {totalSets} set{totalSets === 1 ? "" : "s"}, {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
        </div>
      </div>

      {exercises.map((ex, i) => (
        <Card key={i}>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <Input
              className="max-w-sm border-0 bg-transparent text-base font-semibold shadow-none focus-visible:ring-0"
              placeholder={`Exercise ${i + 1} name (e.g. Goblet Squat)`}
              value={ex.exercise}
              onChange={(e) => {
                const next = [...exercises];
                next[i] = { ...next[i], exercise: e.target.value };
                setExercises(next);
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setExercises(exercises.filter((_, k) => k !== i))}
              aria-label="Remove exercise"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
              <div className="col-span-1">Set</div>
              <div className="col-span-3">Weight (kg)</div>
              <div className="col-span-2">Reps</div>
              <div className="col-span-2">RIR</div>
              <div className="col-span-3">Bodyweight</div>
              <div className="col-span-1" />
            </div>
            {ex.sets.map((st, j) => (
              <div key={j} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-1 text-sm">{st.set_number}</div>
                <Input
                  className="col-span-3"
                  type="number"
                  step="0.5"
                  disabled={st.is_bodyweight}
                  value={st.weight_kg ?? ""}
                  onChange={(e) => updateSet(i, j, { weight_kg: e.target.value === "" ? null : Number(e.target.value) })}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  value={st.reps}
                  onChange={(e) => updateSet(i, j, { reps: Number(e.target.value) })}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  value={st.rir ?? ""}
                  onChange={(e) => updateSet(i, j, { rir: e.target.value === "" ? null : Number(e.target.value) })}
                />
                <label className="col-span-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={st.is_bodyweight}
                    onChange={(e) => updateSet(i, j, { is_bodyweight: e.target.checked, weight_kg: e.target.checked ? null : st.weight_kg })}
                  />
                  BW only
                </label>
                <Button
                  className="col-span-1"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeSet(i, j)}
                  aria-label="Remove set"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => addSet(i)}>
              <Plus className="h-4 w-4" /> Add set
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setExercises([...exercises, newExercise()])}>
          <Plus className="h-4 w-4" /> Add exercise
        </Button>
        <Button
          onClick={() =>
            mut.mutate({
              date,
              split: split || null,
              notes: notes || null,
              exercises: exercises.filter((e) => e.exercise.trim() && e.sets.length),
            })
          }
          disabled={mut.isPending || exercises.every((e) => !e.exercise.trim())}
        >
          Save session
        </Button>
      </div>
      <div>
        <Label className="mb-1 block">Notes</Label>
        <Textarea placeholder="How did it feel?" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </div>
  );

  function updateSet(i: number, j: number, patch: Partial<WorkoutSet>) {
    const next = [...exercises];
    next[i] = { ...next[i], sets: next[i].sets.map((s, k) => (k === j ? { ...s, ...patch } : s)) };
    setExercises(next);
  }
  function addSet(i: number) {
    const next = [...exercises];
    const last = next[i].sets[next[i].sets.length - 1];
    next[i] = {
      ...next[i],
      sets: [...next[i].sets, { ...(last ?? newSet(1)), set_number: next[i].sets.length + 1 }],
    };
    setExercises(next);
  }
  function removeSet(i: number, j: number) {
    const next = [...exercises];
    next[i] = {
      ...next[i],
      sets: next[i].sets.filter((_, k) => k !== j).map((s, k) => ({ ...s, set_number: k + 1 })),
    };
    setExercises(next);
  }
}

function History() {
  const list = useQuery({ queryKey: ["exercises"], queryFn: api.exercises });
  const [selected, setSelected] = useState<string | null>(null);
  const hist = useQuery({
    queryKey: ["history", selected],
    queryFn: () => api.workoutHistory(selected!),
    enabled: !!selected,
  });

  const chartData = useMemo(
    () => (hist.data ?? []).map((s) => ({ date: s.date, best: s.best_score })),
    [hist.data],
  );

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Exercises</CardTitle>
          <CardDescription>Ordered by frequency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {(list.data ?? []).map((e) => (
            <button
              key={e.exercise}
              onClick={() => setSelected(e.exercise)}
              className={
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent " +
                (selected === e.exercise ? "bg-accent" : "")
              }
            >
              <span className="truncate">{e.exercise}</span>
              <Badge variant="muted">{e.sets_logged}</Badge>
            </button>
          ))}
          {list.data && list.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Log a session to see it here.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{selected ?? "Select an exercise"}</CardTitle>
          <CardDescription>Best score per session (e1RM or bodyweight reps)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-48">
            {chartData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    labelFormatter={fmtDate}
                  />
                  <Bar dataKey="best" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {selected ? "No history yet." : "Pick an exercise on the left."}
              </div>
            )}
          </div>
          {(hist.data ?? []).slice(-5).reverse().map((s) => (
            <div key={s.date} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{fmtDate(s.date)}</span>
                <Badge variant="muted">best {s.best_score}</Badge>
              </div>
              <ul className="grid grid-cols-3 gap-1 text-xs">
                {s.sets.map((st, i) => (
                  <li key={i} className="rounded bg-muted px-2 py-1">
                    #{st.set_number}: {st.is_bodyweight ? `BW × ${st.reps}` : `${st.weight_kg}kg × ${st.reps}`}
                    {st.rir != null && ` @${st.rir}RIR`}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PRs() {
  const q = useQuery({ queryKey: ["prs"], queryFn: () => api.prs(180) });
  return (
    <div className="space-y-3">
      {(q.data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">No PRs detected yet. Log a workout that beats your previous best.</p>
      )}
      {(q.data ?? []).map((pr, i) => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-amber-400" />
              <div>
                <div className="font-medium">{pr.exercise as string}</div>
                <div className="text-xs text-muted-foreground">{fmtDate(pr.date as string)}</div>
              </div>
            </div>
            <div className="text-right text-sm">
              {pr.pr_type === "bodyweight" ? (
                <div>{pr.reps as number} reps (prev {pr.previous_best as number})</div>
              ) : (
                <div>
                  {pr.weight_kg as number}kg × {pr.reps as number}{" "}
                  <span className="text-muted-foreground">
                    (e1RM {pr.estimated_1rm as number}, prev {pr.previous_best as number})
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
