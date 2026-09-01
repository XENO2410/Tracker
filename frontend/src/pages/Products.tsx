import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, type Product } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtNum } from "@/lib/utils";

const empty: Product = {
  name: "",
  aliases: [],
  serving_size: 1,
  serving_unit: "serving",
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fibre_g: 0,
  calories: 0,
  notes: null,
};

export default function Products() {
  const q = useQuery({ queryKey: ["products"], queryFn: api.listProducts });
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Locked nutrition for items you eat daily. The parser uses these exact values whenever you mention them.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </div>

      {showForm && (
        <ProductForm
          initial={editing ?? empty}
          isEdit={!!editing}
          onDone={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Your library</CardTitle>
          <CardDescription>{q.data?.length ?? 0} product(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {q.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {q.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add HK Vitals Collagen, your whey, cereal, milk — whatever you eat often.
            </p>
          )}
          {(q.data ?? []).map((p) => (
            <Row
              key={p.name}
              product={p}
              onEdit={() => {
                setEditing(p);
                setShowForm(true);
              }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.deleteProduct(product.name),
    onSuccess: () => {
      toast.success(`Removed ${product.name}`);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{product.name}</span>
          {product.aliases.length > 0 && (
            <span className="text-xs text-muted-foreground">
              aka: {product.aliases.join(", ")}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>
            per {fmtNum(product.serving_size, 1)} {product.serving_unit}
          </span>
          <Badge variant="muted">{fmtNum(product.calories, 0)} kcal</Badge>
          <Badge variant="muted">P {fmtNum(product.protein_g, 1)}</Badge>
          <Badge variant="muted">C {fmtNum(product.carbs_g, 1)}</Badge>
          <Badge variant="muted">F {fmtNum(product.fat_g, 1)}</Badge>
          {product.fibre_g > 0 && <Badge variant="muted">Fibre {fmtNum(product.fibre_g, 1)}</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            if (confirm(`Delete ${product.name}?`)) del.mutate();
          }}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ProductForm({
  initial,
  isEdit,
  onDone,
}: {
  initial: Product;
  isEdit: boolean;
  onDone: () => void;
}) {
  const [f, setF] = useState<Product>(initial);
  const [aliasesRaw, setAliasesRaw] = useState<string>(initial.aliases.join(", "));
  const qc = useQueryClient();

  useEffect(() => {
    setF(initial);
    setAliasesRaw(initial.aliases.join(", "));
  }, [initial]);

  const mut = useMutation({
    mutationFn: () => {
      const payload: Product = {
        ...f,
        aliases: aliasesRaw
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      };
      return isEdit ? api.updateProduct(initial.name, payload) : api.createProduct(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Product updated" : "Product added");
      qc.invalidateQueries({ queryKey: ["products"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{isEdit ? `Edit: ${initial.name}` : "New product"}</CardTitle>
        <Button size="icon" variant="ghost" onClick={onDone} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label className="mb-1 block">Name</Label>
          <Input
            placeholder="Avvatar 100% Performance Whey"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            disabled={isEdit}
          />
        </div>
        <div>
          <Label className="mb-1 block">Aliases (comma separated)</Label>
          <Input
            placeholder="whey, my whey, protein shake"
            value={aliasesRaw}
            onChange={(e) => setAliasesRaw(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-1 block">Serving size</Label>
          <Input
            type="number"
            step="0.1"
            value={f.serving_size}
            onChange={(e) => setF({ ...f, serving_size: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="mb-1 block">Serving unit</Label>
          <Input
            placeholder="g, ml, scoop, packet, whole..."
            value={f.serving_unit}
            onChange={(e) => setF({ ...f, serving_unit: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1 block">Calories</Label>
          <Input
            type="number"
            step="0.1"
            value={f.calories}
            onChange={(e) => setF({ ...f, calories: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="mb-1 block">Protein (g)</Label>
          <Input
            type="number"
            step="0.1"
            value={f.protein_g}
            onChange={(e) => setF({ ...f, protein_g: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="mb-1 block">Carbs (g)</Label>
          <Input
            type="number"
            step="0.1"
            value={f.carbs_g}
            onChange={(e) => setF({ ...f, carbs_g: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="mb-1 block">Fat (g)</Label>
          <Input
            type="number"
            step="0.1"
            value={f.fat_g}
            onChange={(e) => setF({ ...f, fat_g: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="mb-1 block">Fibre (g)</Label>
          <Input
            type="number"
            step="0.1"
            value={f.fibre_g}
            onChange={(e) => setF({ ...f, fibre_g: Number(e.target.value) })}
          />
        </div>
        <div className="md:col-span-3">
          <Label className="mb-1 block">Notes</Label>
          <Textarea
            placeholder="brand, source of values, anything to remember"
            value={f.notes ?? ""}
            onChange={(e) => setF({ ...f, notes: e.target.value || null })}
          />
        </div>
        <div className="md:col-span-3 flex gap-2">
          <Button onClick={() => mut.mutate()} disabled={!f.name.trim() || mut.isPending}>
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add product"}
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
