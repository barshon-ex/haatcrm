"use client";
import { useActionState } from "react";
import { saveSettingsAction, type ActionState } from "@/app/actions";
import type { Dict } from "@/lib/i18n";

export function SettingsForm({ t, s }: { t: Dict; s: Record<string, string> }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettingsAction, undefined);
  return (
    <form action={action}>
      <label>{t["set.shopName"]}<input name="shop_name" defaultValue={s.shop_name} required /></label>
      <label>{t["set.shopPhone"]}<input name="shop_phone" defaultValue={s.shop_phone} inputMode="tel" /></label>
      <label>{t["set.shopPage"]}<input name="shop_page" defaultValue={s.shop_page} placeholder="https://facebook.com/yourpage" /></label>
      <div className="row gap">
        <label className="grow">{t["set.deliveryInside"]}<input name="delivery_inside" type="number" min={0} defaultValue={s.delivery_inside} /></label>
        <label className="grow">{t["set.deliveryOutside"]}<input name="delivery_outside" type="number" min={0} defaultValue={s.delivery_outside} /></label>
      </div>
      <div className="row gap">
        <button className="btn primary" disabled={pending}>{t["set.save"]}</button>
        {state?.ok && !pending && <span className="success">{t["set.saved"]}</span>}
      </div>
    </form>
  );
}
