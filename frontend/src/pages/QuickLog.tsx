import QuickLogInput from "@/components/QuickLogInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const examples = [
  { label: "Food", text: "3 idlis with sambar and chutney for breakfast" },
  { label: "Food + protein shake", text: "1 scoop whey with 250ml milk post workout" },
  { label: "Water", text: "750ml water" },
  { label: "Weight", text: "weight 61.4" },
  { label: "Waist", text: "waist 82.5 cm" },
  { label: "Workout", text: "goblet squat 3x10 @ 20kg, RIR 2" },
  { label: "Bodyweight", text: "5 pull-ups, 3 sets" },
  { label: "Steps", text: "10800 steps today" },
  { label: "Craving", text: "strong craving for misal pav before dinner, didn't eat it" },
  { label: "Treat", text: "had pizza slice for dinner, satisfaction 7/10, worth it yes" },
  { label: "Sleep", text: "slept 4/5, energy 4, stress 2, sore legs 3" },
];

export default function QuickLog() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quick Log</h1>
        <p className="text-sm text-muted-foreground">
          Type it however you want. The parser classifies and pulls out the numbers.
        </p>
      </div>

      <QuickLogInput />

      <Card>
        <CardHeader>
          <CardTitle>Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            {examples.map((e) => (
              <li key={e.text} className="rounded-md border bg-card p-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">{e.label}</div>
                <code className="text-sm">{e.text}</code>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
