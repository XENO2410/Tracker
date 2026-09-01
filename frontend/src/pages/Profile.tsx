import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type Profile as ProfileT } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const empty: ProfileT = {
  height_cm: null,
  gender: null,
  dob: null,
  goal_weight_kg: null,
  daily_protein_target_g: null,
  daily_water_target_ml: null,
  daily_calorie_target: null,
  maintenance_calories: null,
  daily_steps_target: 10000,
  goal: "recomp",
};

export default function Profile() {
  const q = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const [f, setF] = useState<ProfileT>(empty);
  useEffect(() => {
    if (q.data) setF(q.data);
  }, [q.data]);

  const mut = useMutation({
    mutationFn: (p: ProfileT) => api.putProfile(p),
    onSuccess: () => toast.success("Profile saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  const num = (v: string): number | null => (v === "" ? null : Number(v));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Targets drive the dashboard bars and adherence scoring. Fill this in first.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>You</CardTitle>
          <CardDescription>Used for BMR / TDEE guesses if calorie targets are blank.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Field label="Height (cm)"><Input type="number" step="0.5" value={f.height_cm ?? ""} onChange={(e) => setF({ ...f, height_cm: num(e.target.value) })} /></Field>
          <Field label="Gender">
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.gender ?? ""} onChange={(e) => setF({ ...f, gender: e.target.value || null })}>
              <option value="">—</option>
              <option>male</option>
              <option>female</option>
              <option>other</option>
            </select>
          </Field>
          <Field label="Date of birth"><Input type="date" value={f.dob ?? ""} onChange={(e) => setF({ ...f, dob: e.target.value || null })} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
          <CardDescription>Recomp = maintain or gently drop weight while retaining muscle.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Field label="Goal">
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })}>
              <option value="recomp">recomp</option>
              <option value="lose">lose</option>
              <option value="maintain">maintain</option>
              <option value="gain">gain</option>
            </select>
          </Field>
          <Field label="Goal weight (kg)"><Input type="number" step="0.1" value={f.goal_weight_kg ?? ""} onChange={(e) => setF({ ...f, goal_weight_kg: num(e.target.value) })} /></Field>
          <Field label="Maintenance calories"><Input type="number" value={f.maintenance_calories ?? ""} onChange={(e) => setF({ ...f, maintenance_calories: num(e.target.value) })} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily targets</CardTitle>
          <CardDescription>These populate the dashboard progress bars.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Field label="Protein (g)"><Input type="number" value={f.daily_protein_target_g ?? ""} onChange={(e) => setF({ ...f, daily_protein_target_g: num(e.target.value) })} /></Field>
          <Field label="Calories"><Input type="number" value={f.daily_calorie_target ?? ""} onChange={(e) => setF({ ...f, daily_calorie_target: num(e.target.value) })} /></Field>
          <Field label="Water (ml)"><Input type="number" value={f.daily_water_target_ml ?? ""} onChange={(e) => setF({ ...f, daily_water_target_ml: num(e.target.value) })} /></Field>
          <Field label="Steps"><Input type="number" value={f.daily_steps_target} onChange={(e) => setF({ ...f, daily_steps_target: Number(e.target.value) || 0 })} /></Field>
        </CardContent>
      </Card>

      <Button onClick={() => mut.mutate(f)} disabled={mut.isPending}>Save profile</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
