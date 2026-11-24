import { getT } from "@/lib/lang";
import { listTemplates } from "@/lib/repo";
import { deleteTemplateAction, saveTemplateAction } from "@/app/actions";

export default async function TemplatesPage() {
  const { t } = await getT();
  const templates = listTemplates();
  return (
    <>
      <h1>{t["tpl.title"]}</h1>
      <p className="muted">{t["tpl.help"]}</p>
      {templates.map((tpl) => (
        <section key={tpl.id} className="card">
          <form action={saveTemplateAction}>
            <input type="hidden" name="id" value={tpl.id} />
            <label>{t["tpl.name"]}<input name="name" defaultValue={tpl.name} required /></label>
            <label>{t["tpl.body"]}<textarea name="body" rows={4} defaultValue={tpl.body} required /></label>
            <div className="row gap">
              <button className="btn primary sm">{t["tpl.save"]}</button>
              <button className="btn danger sm" formAction={deleteTemplateAction}>{t["tpl.delete"]}</button>
            </div>
          </form>
        </section>
      ))}
      <section className="card">
        <h3>＋ {t["tpl.add"]}</h3>
        <form action={saveTemplateAction}>
          <label>{t["tpl.name"]}<input name="name" required /></label>
          <label>{t["tpl.body"]}<textarea name="body" rows={4} required placeholder="{name}, ..." /></label>
          <button className="btn primary sm">{t["tpl.save"]}</button>
        </form>
      </section>
    </>
  );
}
