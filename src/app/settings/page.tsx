import { getT } from "@/lib/lang";
import { getSettings } from "@/lib/repo";
import { SettingsForm } from "@/components/SettingsForm";
import { LangToggle } from "@/components/LangToggle";

export default async function SettingsPage() {
  const { t, lang } = await getT();
  return (
    <>
      <h1>{t["set.title"]}</h1>
      <div className="grid-2">
        <section className="card">
          <SettingsForm t={t} s={getSettings()} />
        </section>
        <div>
          <section className="card">
            <h3>{t["set.language"]}</h3>
            <LangToggle lang={lang} />
          </section>
          <section className="card">
            <h3>💾 {t["set.backup"]}</h3>
            <p className="muted" style={{ margin: 0 }}>{t["set.backupHelp"]}</p>
          </section>
        </div>
      </div>
    </>
  );
}
