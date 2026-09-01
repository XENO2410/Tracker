import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDate, fmtNum, todayISO } from "@/lib/utils";

export default function Body() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Body</h1>
        <p className="text-sm text-muted-foreground">
          Weight is noisy. Waist changes are the truth. Log both regularly.
        </p>
      </div>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Log measurement</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        <TabsContent value="log">
          <LogForm />
        </TabsContent>
        <TabsContent value="trends">
          <Trends />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface Form {
  date: string;
  weight_kg: string;
  waist_cm: string;
  abdomen_cm: string;
  chest_cm: string;
  arm_cm: string;
  thigh_cm: string;
  hip_cm: string;
  body_fat_pct: string;
  notes: string;
}

function LogForm() {
  const [f, setF] = useState<Form>({
    date: todayISO(),
    weight_kg: "",
    waist_cm: "",
    abdomen_cm: "",
    chest_cm: "",
    arm_cm: "",
    thigh_cm: "",
    hip_cm: "",
    body_fat_pct: "",
    notes: "",
  });
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () =>
      api.logMeasurement({
        date: f.date,
        weight_kg: num(f.weight_kg),
        waist_cm: num(f.waist_cm),
        abdomen_cm: num(f.abdomen_cm),
        chest_cm: num(f.chest_cm),
        arm_cm: num(f.arm_cm),
        thigh_cm: num(f.thigh_cm),
        hip_cm: num(f.hip_cm),
        body_fat_pct: num(f.body_fat_pct),
        notes: f.notes || null,
      }),
    onSuccess: () => {
      toast.success("Measurement logged");
      setF({ ...f, weight_kg: "", waist_cm: "", abdomen_cm: "", chest_cm: "", arm_cm: "", thigh_cm: "", hip_cm: "", body_fat_pct: "", notes: "" });
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = (k: keyof Form, label: string, step = "0.1") => (
    <div>
      <Label className="mb-1 block">{label}</Label>
      <Input type={k === "date" || k === "notes" ? undefined : "number"} step={step} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {field("date", "Date")}
      {field("weight_kg", "Weight (kg)", "0.01")}
      {field("body_fat_pct", "Body fat %", "0.1")}
      {field("waist_cm", "Waist (cm)")}
      {field("abdomen_cm", "Abdomen (cm)")}
      {field("hip_cm", "Hips (cm)")}
      {field("chest_cm", "Chest (cm)")}
      {field("arm_cm", "Arm (cm)")}
      {field("thigh_cm", "Thigh (cm)")}
      <div className="md:col-span-3">
        <Label className="mb-1 block">Notes</Label>
        <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </div>
      <div className="md:col-span-3">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          Save
        </Button>
      </div>
    </div>
  );
}

function num(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function Trends() {
  const q = useQuery({ queryKey: ["measurements"], queryFn: () => api.measurements(180) });
  const rows = q.data ?? [];
  const latest = rows[rows.length - 1];

  return (
    <div className="space-y-4">
      {latest && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Weight" value={fmtNum(latest.weight_kg, 2)} unit="kg" />
          <Metric label="Waist" value={fmtNum(latest.waist_cm, 1)} unit="cm" />
          <Metric label="Abdomen" value={fmtNum(latest.abdomen_cm, 1)} unit="cm" />
          <Metric label="Body fat" value={fmtNum(latest.body_fat_pct, 1)} unit="%" />
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Waist vs Weight</CardTitle>
          <CardDescription>Waist trending down while weight holds ≈ fat loss with muscle retention.</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {rows.length > 1 ? (
            <ResponsiveContainer>
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={fmtDate} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="w" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} width={40} />
                <YAxis yAxisId="c" orientation="right" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  labelFormatter={fmtDate}
                />
                <Line yAxisId="w" type="monotone" dataKey="weight_kg" name="Weight" stroke="hsl(var(--primary))" dot={{ r: 2 }} connectNulls />
                <Line yAxisId="c" type="monotone" dataKey="waist_cm" name="Waist" stroke="#f59e0b" dot={{ r: 2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Log at least two measurements to see trends.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">
          {value} <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
