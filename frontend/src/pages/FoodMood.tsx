import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDate, todayISO } from "@/lib/utils";
import QuickLogInput from "@/components/QuickLogInput";

export default function FoodMood() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Food & Mood</h1>
        <p className="text-sm text-muted-foreground">
          Not just what you ate — hunger, cravings, treats, satisfaction. This is where sustainability lives.
        </p>
      </div>
      <Tabs defaultValue="food">
        <TabsList>
          <TabsTrigger value="food">Food</TabsTrigger>
          <TabsTrigger value="craving">Cravings</TabsTrigger>
          <TabsTrigger value="treat">Treats</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
        </TabsList>
        <TabsContent value="food">
          <FoodTab />
        </TabsContent>
        <TabsContent value="craving">
          <CravingTab />
        </TabsContent>
        <TabsContent value="treat">
          <TreatTab />
        </TabsContent>
        <TabsContent value="recovery">
          <RecoveryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FoodTab() {
  const q = useQuery({ queryKey: ["foodRecent"], queryFn: () => api.foodRecent(7) });
  return (
    <div className="space-y-4">
      <QuickLogInput placeholder="Log any meal in natural language..." />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Last 7 days</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {(q.data ?? []).length === 0 && <p className="text-muted-foreground">No food logged yet.</p>}
          {(q.data ?? []).map((r, i) => (
            <div key={i} className="flex items-center justify-between border-b py-2 last:border-b-0">
              <div>
                <span className="font-medium">{r.Food_Item as string}</span>
                <span className="ml-2 text-muted-foreground">
                  {r.Quantity as number} {r.Unit as string} · {r.Meal as string}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.Calories as number} kcal · P{r.Protein_g as number} · {fmtDate(r.Date as string)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CravingTab() {
  const [f, setF] = useState({
    date: todayISO(),
    meal: "",
    craving_level: "moderate",
    what_craved: "",
    ate_it: false,
    trigger_context: "",
    notes: "",
  });
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["cravingsRecent"], queryFn: () => api.cravingsRecent(30) });
  const mut = useMutation({
    mutationFn: () =>
      api.logCraving({
        date: f.date,
        meal: f.meal || null,
        craving_level: f.craving_level,
        what_craved: f.what_craved,
        ate_it: f.ate_it,
        trigger_context: f.trigger_context || null,
        notes: f.notes || null,
      }),
    onSuccess: () => {
      toast.success("Craving logged");
      setF({ ...f, what_craved: "", trigger_context: "", notes: "" });
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Log a craving</CardTitle>
          <CardDescription>Not to judge. To spot patterns.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="mb-1 block">Date</Label>
            <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block">Around meal</Label>
            <Input placeholder="dinner / snack / ..." value={f.meal} onChange={(e) => setF({ ...f, meal: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block">Intensity</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={f.craving_level}
              onChange={(e) => setF({ ...f, craving_level: e.target.value })}
            >
              <option>none</option>
              <option>mild</option>
              <option>moderate</option>
              <option>strong</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label className="mb-1 block">What did you crave?</Label>
            <Input placeholder="misal pav, chocolate, ..." value={f.what_craved} onChange={(e) => setF({ ...f, what_craved: e.target.value })} />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.ate_it} onChange={(e) => setF({ ...f, ate_it: e.target.checked })} />
              Ate it
            </label>
          </div>
          <div className="md:col-span-3">
            <Label className="mb-1 block">What was happening?</Label>
            <Textarea placeholder="stressed at work, dinner was delayed, saw an ad..." value={f.trigger_context} onChange={(e) => setF({ ...f, trigger_context: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Button onClick={() => mut.mutate()} disabled={!f.what_craved.trim() || mut.isPending}>
              Log craving
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(list.data ?? []).map((r, i) => (
            <div key={i} className="flex items-center justify-between border-b pb-2 last:border-b-0">
              <div>
                <div className="text-sm font-medium">{r.What_Craved as string}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtDate(r.Date as string)} · {r.Meal as string} · trigger: {(r.Trigger_Context as string) || "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.Craving_Level === "strong" ? "destructive" : "muted"}>
                  {r.Craving_Level as string}
                </Badge>
                <Badge variant={String(r.Ate_It).toLowerCase() === "true" ? "default" : "success"}>
                  {String(r.Ate_It).toLowerCase() === "true" ? "ate" : "resisted"}
                </Badge>
              </div>
            </div>
          ))}
          {(list.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function TreatTab() {
  const [f, setF] = useState({
    date: todayISO(),
    meal: "dinner",
    items: "",
    est_calories: "",
    satisfaction_1_10: 7,
    worth_it: true,
    notes: "",
  });
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["treatsRecent"], queryFn: () => api.treatsRecent(60) });
  const mut = useMutation({
    mutationFn: () =>
      api.logTreat({
        date: f.date,
        meal: f.meal,
        items: f.items,
        est_calories: f.est_calories ? Number(f.est_calories) : null,
        satisfaction_1_10: f.satisfaction_1_10,
        worth_it: f.worth_it,
        notes: f.notes || null,
      }),
    onSuccess: () => {
      toast.success("Treat logged");
      setF({ ...f, items: "", est_calories: "", notes: "" });
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Was it worth it?</CardTitle>
          <CardDescription>Track what you actually enjoy — not what you feel guilty about.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="mb-1 block">Date</Label>
            <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block">Meal</Label>
            <Input value={f.meal} onChange={(e) => setF({ ...f, meal: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block">Est. calories</Label>
            <Input type="number" value={f.est_calories} onChange={(e) => setF({ ...f, est_calories: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Label className="mb-1 block">What did you have?</Label>
            <Input placeholder="pizza slice + coke" value={f.items} onChange={(e) => setF({ ...f, items: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block">Satisfaction (1-10): {f.satisfaction_1_10}</Label>
            <input
              type="range"
              min={1}
              max={10}
              value={f.satisfaction_1_10}
              onChange={(e) => setF({ ...f, satisfaction_1_10: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div className="flex items-end gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.worth_it} onChange={(e) => setF({ ...f, worth_it: e.target.checked })} />
              Worth it
            </label>
          </div>
          <div />
          <div className="md:col-span-3">
            <Label className="mb-1 block">Notes</Label>
            <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Button onClick={() => mut.mutate()} disabled={!f.items.trim() || mut.isPending}>
              Log treat
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Recent treats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(list.data ?? []).map((r, i) => (
            <div key={i} className="flex items-center justify-between border-b pb-2 last:border-b-0">
              <div>
                <div className="text-sm font-medium">{r.Items as string}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtDate(r.Date as string)} · {r.Meal as string} · {r.Est_Calories as number} kcal
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="muted">{r.Satisfaction_1_10 as number}/10</Badge>
                <Badge variant={String(r.Worth_It).toLowerCase() === "true" ? "success" : "destructive"}>
                  {String(r.Worth_It).toLowerCase() === "true" ? "worth it" : "not worth it"}
                </Badge>
              </div>
            </div>
          ))}
          {(list.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function RecoveryTab() {
  const [f, setF] = useState({
    date: todayISO(),
    sleep_score: 3,
    energy: 3,
    stress: 3,
    soreness: 2,
    mood: 3,
    notes: "",
  });
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () =>
      api.logRecovery({
        date: f.date,
        sleep_score: f.sleep_score,
        energy: f.energy,
        stress: f.stress,
        soreness: f.soreness,
        mood: f.mood,
        notes: f.notes || null,
      }),
    onSuccess: () => {
      toast.success("Recovery logged");
      setF({ ...f, notes: "" });
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scale = (k: "sleep_score" | "energy" | "stress" | "soreness" | "mood", label: string) => (
    <div>
      <Label className="mb-1 block">{label} — {f[k]}</Label>
      <input type="range" min={1} max={5} value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} className="w-full" />
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Daily recovery</CardTitle>
        <CardDescription>1 = worst, 5 = best. Log it before bed.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="mb-1 block">Date</Label>
          <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </div>
        <div />
        {scale("sleep_score", "Sleep")}
        {scale("energy", "Energy")}
        {scale("stress", "Stress")}
        {scale("soreness", "Soreness")}
        {scale("mood", "Mood")}
        <div className="md:col-span-2">
          <Label className="mb-1 block">Notes</Label>
          <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
