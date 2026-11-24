import { getT } from "@/lib/lang";
import { getSettings, listProducts } from "@/lib/repo";
import { OrderForm } from "@/components/OrderForm";

export default async function NewOrderPage() {
  const { t, lang } = await getT();
  const s = getSettings();
  const products = listProducts(true).map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock }));
  return (
    <>
      <h1>{t["nav.newOrder"]}</h1>
      <OrderForm
        t={t}
        lang={lang}
        products={products}
        deliveryInside={Number(s.delivery_inside) || 70}
        deliveryOutside={Number(s.delivery_outside) || 130}
      />
    </>
  );
}
