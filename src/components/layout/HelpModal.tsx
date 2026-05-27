import { useEffect } from 'react';

interface Props {
    onClose: () => void;
}

// Sectional usage guide. Reuses theme CSS variables so it follows the
// active theme (dark/light/colorblind) automatically.
export default function HelpModal({ onClose }: Props) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="no-print"
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)',
                    borderRadius: '12px', padding: '28px 32px', maxWidth: '620px', width: '90%',
                    maxHeight: '85vh', overflowY: 'auto', fontFamily: "'Azeret Mono', monospace",
                    color: 'var(--text-main)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h2 style={{ color: 'var(--accent-purple)', margin: 0, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Hulp
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', color: 'var(--text-muted)',
                            fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
                        }}
                        title="Sluiten (Esc)"
                    >×</button>
                </div>

                <Section title="1. Oefeningen toevoegen">
                    Klik in de linker zijbalk op een leerdomein, daarna op een onderdeel, en uiteindelijk op het type oefening dat je wil toevoegen. Het verschijnt onmiddellijk op het werkblad in het midden.
                </Section>

                <Section title="2. Configureren en genereren">
                    Klik op een blok om het rechterpaneel te openen. Stel de parameters in (aantal oefeningen, moeilijkheidsgraad, masker, …) en klik op <strong>Genereer</strong> om oefeningen te maken. <strong>Genereer alles</strong> bovenaan vernieuwt alle blokken in één klik.
                </Section>

                <Section title="3. Blokken vergrendelen">
                    Klik op het 🔓 / 🔒 slot-icoontje bij een actief blok om het te vergrendelen. Vergrendelde blokken worden overgeslagen bij <strong>Genereer alles</strong> — handig voor blokken die je handmatig aangepast hebt.
                </Section>

                <Section title="4. Automatisch opslaan">
                    Je werk wordt voortdurend bewaard in je browser. Sluit je per ongeluk het tabblad? Geen probleem — bij de volgende keer dat je de pagina opent vraagt de tool of je de vorige werkbundel wil terughalen.
                </Section>

                <Section title="5. Presets en bestanden">
                    Klik op <strong>📑 Presets</strong> om je werkbundel een naam te geven en lokaal te bewaren (tot 20 stuks). Handig om sjablonen te maken voor terugkerende toetsen. Met <strong>💾 Exporteer</strong> sla je op als JSON-bestand om te delen met collega's. Met <strong>📂 Importeer</strong> open je een bestaand JSON-bestand. Met <strong>🔗 Deel</strong> kopieer je een link die de volledige werkbundel bevat — handig om snel met een collega te delen.
                </Section>

                <Section title="6. Tip — sjablonen">
                    Stel alle blokken in zoals je ze wil en bewaar als preset <strong>voor</strong> je op Genereer klikt. Later laad je de preset opnieuw en klik je op <strong>Genereer alles</strong> om met dezelfde structuur nieuwe oefeningen te krijgen.
                </Section>

                <Section title="7. Blok dupliceren">
                    Klik op het 🗐 icoontje bij een actief blok om het te kopiëren. Handig wanneer je drie gelijkaardige blokken met kleine variaties wil.
                </Section>

                <Section title="8. Afdrukken">
                    Druk op <strong>Print</strong> in de bovenbalk (of Ctrl+P). Kies in het afdrukvenster van je browser "Opslaan als PDF" om een digitaal bestand te maken in plaats van op papier af te drukken.
                </Section>

                <Section title="9. Thema">
                    Onderaan de zijbalk wissel je tussen Licht (☀), Donker (☽) en Hoog contrast (◐, kleurenblind-veilig).
                </Section>

                <Section title="Bugs of suggesties?">
                    Stuur een DM via X (zie 𝕏-knop onderaan de zijbalk). Vind je deze tool nuttig? Trakteer me op een koffie via de ❤-knop ernaast.
                </Section>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '12px', color: 'var(--accent-purple)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-muted)', margin: 0 }}>{children}</p>
        </div>
    );
}
