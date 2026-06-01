import { useEffect, useState } from 'react';

interface Props {
    onClose: () => void;
    onStartTour?: () => void;
}

type Tab = 'ouders' | 'leerkrachten';

// Sectional usage guide, split into a parent view and a teacher view (basis +
// geavanceerd). Reuses theme CSS variables so it follows the active theme.
export default function HelpModal({ onClose, onStartTour }: Props) {
    const [tab, setTab] = useState<Tab>('ouders');

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
                    borderRadius: '12px', padding: '28px 32px', maxWidth: '680px', width: '90%',
                    maxHeight: '85vh', overflowY: 'auto', fontFamily: "'Azeret Mono', monospace",
                    color: 'var(--text-main)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ color: 'var(--accent-purple)', margin: 0, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Hulp
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
                        title="Sluiten (Esc)"
                    >×</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', alignItems: 'center' }}>
                    <TabBtn active={tab === 'ouders'} onClick={() => setTab('ouders')}>Voor ouders</TabBtn>
                    <TabBtn active={tab === 'leerkrachten'} onClick={() => setTab('leerkrachten')}>Voor leerkrachten</TabBtn>
                    {onStartTour && (
                        <button
                            onClick={onStartTour}
                            style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', border: '1px solid var(--accent-purple)', background: 'transparent', color: 'var(--accent-purple)' }}
                            title="Start de rondleiding opnieuw"
                        >▶ Rondleiding</button>
                    )}
                </div>

                {tab === 'ouders' && (
                    <>
                        <Section title="1. Oefeningen toevoegen">
                            Klik in de linker zijbalk op een oefening uit de toegestane lijst. Ze verschijnt onmiddellijk op het werkblad in het midden. Je kan meerdere oefeningen onder elkaar zetten.
                        </Section>
                        <Section title="2. Aantal aanpassen en genereren">
                            Klik op een blok om het rechterpaneel te openen. Versleep <strong>Aantal oefeningen</strong> om meer of minder te maken, en klik op <strong>Genereer</strong> voor nieuwe getallen. <strong>Genereer alles</strong> bovenaan vernieuwt elk blok in één klik. De moeilijkheidsgraad ligt vast.
                        </Section>
                        <Section title="3. Afdrukken">
                            Druk op <strong>Afdrukken</strong> in de bovenbalk (of Ctrl+P). Kies in het afdrukvenster van je browser "Opslaan als PDF" om een digitaal bestand te maken in plaats van op papier.
                        </Section>
                        <Section title="4. Thema">
                            Onderaan de zijbalk wissel je tussen Licht (☀), Donker (☽) en Hoog contrast (◐, kleurenblind-veilig).
                        </Section>
                    </>
                )}

                {tab === 'leerkrachten' && (
                    <>
                        <GroupHeader>Basis</GroupHeader>
                        <Section title="1. Oefeningen toevoegen">
                            Klik in de linker zijbalk op een leerdomein, dan op een onderdeel, en uiteindelijk op het type oefening. Het verschijnt onmiddellijk op het werkblad. Of gebruik <strong>Toevoegen</strong> bovenaan om er meerdere tegelijk te kiezen.
                        </Section>
                        <Section title="2. Configureren en genereren">
                            Klik op een blok om het rechterpaneel te openen. Stel de parameters in (aantal, moeilijkheidsgraad, masker, …) en klik op <strong>Genereer</strong>. <strong>Genereer alles</strong> vernieuwt alle blokken.
                        </Section>
                        <Section title="3. Blokken vergrendelen">
                            Klik op het 🔓 / 🔒 slot bij een actief blok. Vergrendelde blokken worden overgeslagen bij <strong>Genereer alles</strong> — handig voor handmatig aangepaste blokken.
                        </Section>
                        <Section title="4. Automatisch opslaan">
                            Je werk wordt voortdurend in je browser bewaard. Sluit je per ongeluk het tabblad, dan vraagt de tool bij de volgende keer of je de vorige werkbundel wil terughalen.
                        </Section>
                        <Section title="5. Presets, bestanden en delen">
                            Onder <strong>⋯ Meer</strong>: <strong>Presets</strong> (lokaal bewaren, tot 20), <strong>Exporteer</strong> / <strong>Importeer</strong> (JSON-bestand). Met <strong>Delen</strong> kies je tussen <strong>Blad</strong> (volledige werkbundel) of <strong>Sjabloon</strong> (enkel instellingen).
                        </Section>
                        <Section title="6. Dupliceren en afdrukken">
                            Het 🗐 icoontje kopieert een blok. Druk af met <strong>Afdrukken</strong> (Ctrl+P) → "Opslaan als PDF" voor een digitaal bestand.
                        </Section>

                        <GroupHeader>Geavanceerd</GroupHeader>
                        <Section title="Basisinstellingen">
                            Zijbalk → het <strong>⚙ tandwiel</strong> onderaan → <strong>Basisinstellingen</strong>. Stel één keer een standaard moeilijkheidsgraad in (maximum getal, getalsoort, getalopbouw en bruggetjes). Die wordt overgenomen door elk <strong>nieuw</strong> blok dat je toevoegt — bestaande blokken blijven ongewijzigd. Zo hoef je niet telkens alles opnieuw in te stellen. Getalopbouw en bruggetjes gelden enkel voor hoofdrekenen, cijferen en splitsen.
                        </Section>
                        <Section title="Curriculum samenstellen">
                            Zijbalk → het <strong>⚙ tandwiel</strong> onderaan → <strong>Curriculum samenstellen</strong>. Kies welke oefentypes ouders mogen toevoegen (toon/verberg, ook per leerdomein in bulk) en stel per type de moeilijkheidsgraad in met een voorbeeld ernaast. Klik op <strong>Deel curriculum-link</strong>: de ouder opent die link en kan dan enkel oefeningen uit jouw lijst toevoegen, het aantal aanpassen en opnieuw genereren — de moeilijkheidsgraad ligt vast. Ideaal om een lijst per handboek te delen.
                        </Section>

                        <Section title="Bugs of suggesties?">
                            Stuur een DM via X (𝕏-knop onderaan de zijbalk). Vind je deze tool nuttig? Trakteer me op een koffie via de ❤-knop ernaast.
                        </Section>
                    </>
                )}
            </div>
        </div>
    );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                fontFamily: 'inherit', border: `1px solid ${active ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                background: active ? 'var(--accent-purple)' : 'var(--bg-input)', color: active ? '#fff' : 'var(--text-muted)',
            }}
        >{children}</button>
    );
}

function GroupHeader({ children }: { children: React.ReactNode }) {
    return (
        <h3 style={{ fontSize: '13px', color: 'var(--text-main)', margin: '6px 0 14px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {children}
        </h3>
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
