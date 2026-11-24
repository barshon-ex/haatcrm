import { getT } from "@/lib/lang";
import { listProducts } from "@/lib/repo";
import { saveProductAction } from "@/app/actions";

export default async function ProductsPage() {
  const { t } = await getT();
  const products = listProducts();
  return (
    <>
      <h1>{t["prod.title"]}</h1>
      <section className="card">
        <h3>＋ {t["prod.add"]}</h3>
        <form action={saveProductAction} className="row gap" style={{ alignItems: "flex-end" }}>
          <label className="grow">{t["prod.name"]}<input name="name" required /></label>
          <label style={{ width: 130 }}>{t["prod.sku"]}<input name="sku" /></label>
          <label style={{ width: 110 }}>{t["prod.price"]}<input name="price" type="number" min={0} required /></label>
          <label style={{ width: 90 }}>{t["prod.stock"]}<input name="stock" type="number" defaultValue={0} /></label>
          <input type="hidden" name="active" value="1" />
          <button className="btn primary" style={{ marginBottom: "0.7rem" }}>{t["prod.add"]}</button>
        </form>
      </section>

      <section className="card">
        {products.length === 0 && <div className="empty">{t["prod.none"]}</div>}
        {products.map((p) => (
          <form key={`${p.id}-${p.name}-${p.price}-${p.stock}-${p.active}`} action={saveProductAction} className="row gap" style={{ alignItems: "flex-end", borderBottom: "1px solid var(--line)", paddingTop: "0.5rem", opacity: p.active ? 1 : 0.55 }}>
            <input type="hidden" name="id" value={p.id} />
            <label className="grow">{t["prod.name"]}<input name="name" defaultValue={p.name} required /></label>
            <label style={{ width: 130 }}>{t["prod.sku"]}<input name="sku" defaultValue={p.sku ?? ""} /></label>
            <label style={{ width: 110 }}>{t["prod.price"]}<input name="price" type="number" min={0} defaultValue={p.price} /></label>
            <label style={{ width: 90 }}>
              {t["prod.stock"]}
              <input name="stock" type="number" defaultValue={p.stock} style={{ color: p.stock <= 0 ? "var(--bad)" : undefined }} />
            </label>
            <label className="check" style={{ marginBottom: "1.1rem" }}>
              <input type="checkbox" name="active" defaultChecked={!!p.active} /> {t["prod.active"]}
            </label>
            <button className="btn sm" style={{ marginBottom: "0.9rem" }}>{t["prod.save"]}</button>
          </form>
        ))}
      </section>
    </>
  );
}
