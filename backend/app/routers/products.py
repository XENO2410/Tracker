"""Products CRUD — user-owned food items with locked nutrition values."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..clients.sheets import SheetsClient, get_sheets_client
from ..schemas.logs import Product

router = APIRouter()

_ALIAS_SEP = "|"


def _row_from_product(p: Product) -> list:
    return [
        p.name,
        _ALIAS_SEP.join(a.strip() for a in p.aliases if a.strip()),
        p.serving_size,
        p.serving_unit,
        p.protein_g, p.carbs_g, p.fat_g, p.fibre_g, p.calories,
        p.notes or "",
    ]


def _product_from_row(r: dict) -> Product:
    aliases_raw = str(r.get("Aliases") or "")
    aliases = [a.strip() for a in aliases_raw.split(_ALIAS_SEP) if a.strip()]
    return Product(
        name=str(r.get("Name") or "").strip(),
        aliases=aliases,
        serving_size=float(r.get("Serving_Size") or 1),
        serving_unit=str(r.get("Serving_Unit") or "serving"),
        protein_g=float(r.get("Protein_g") or 0),
        carbs_g=float(r.get("Carbs_g") or 0),
        fat_g=float(r.get("Fat_g") or 0),
        fibre_g=float(r.get("Fibre_g") or 0),
        calories=float(r.get("Calories") or 0),
        notes=str(r.get("Notes") or "") or None,
    )


@router.get("", response_model=list[Product])
def list_products(sc: SheetsClient = Depends(get_sheets_client)) -> list[Product]:
    return [_product_from_row(r) for r in sc.get_products() if r.get("Name")]


@router.post("", response_model=Product)
def create_product(p: Product, sc: SheetsClient = Depends(get_sheets_client)) -> Product:
    existing = {str(r.get("Name") or "").strip().lower() for r in sc.get_products()}
    if p.name.strip().lower() in existing:
        raise HTTPException(status_code=409, detail=f"Product '{p.name}' already exists")
    sc.append_row("Products", _row_from_product(p))
    sc.invalidate_products()
    return p


@router.put("/{name}", response_model=Product)
def update_product(name: str, p: Product, sc: SheetsClient = Depends(get_sheets_client)) -> Product:
    ws = sc.ws("Products")
    rows = ws.get_all_values()
    for i, row in enumerate(rows[1:], start=2):
        if row and row[0].strip().lower() == name.strip().lower():
            ws.update(values=[_row_from_product(p)], range_name=f"A{i}")
            sc.invalidate_products()
            return p
    raise HTTPException(status_code=404, detail=f"Product '{name}' not found")


@router.delete("/{name}")
def delete_product(name: str, sc: SheetsClient = Depends(get_sheets_client)) -> dict:
    ws = sc.ws("Products")
    rows = ws.get_all_values()
    for i, row in enumerate(rows[1:], start=2):
        if row and row[0].strip().lower() == name.strip().lower():
            ws.delete_rows(i)
            sc.invalidate_products()
            return {"ok": True}
    raise HTTPException(status_code=404, detail=f"Product '{name}' not found")
