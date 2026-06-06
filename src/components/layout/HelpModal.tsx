import { useEffect, useState } from 'react';
import ModalPortal from '../ui/ModalPortal';

interface Props {
    onClose: () => void;
    onStartTour?: () => void;
}

type Tab = 'maken' | 'opslaan' | 'delen';

// Step-by-step usage guide in three levels: build a worksheet, save/load worksheets,
// share worksheets. Kept in sync with the current chrome (topbar ≡ Menu + ⚙ Instellingen,
// Oefeningen/Overzicht tabs, Bibliotheek presets). Reuses theme CSS variables.
export default function HelpModal({ onClose, onStartTour }: Props) {
    const [tab, setTab] = useState<Tab>('maken');

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <ModalPortal>
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

                {/* Tabs = three levels */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <TabBtn active={tab === 'maken'} onClick={() => setTab('maken')}>Eigen werkblad maken</TabBtn>
                    <TabBtn active={tab === 'opslaan'} onClick={() => setTab('opslaan')}>Werkbladen opslaan</TabBtn>
                    <TabBtn active={tab === 'delen'} onClick={() => setTab('delen')}>Werkbladen delen</TabBtn>
                    {onStartTour && (
                        <button
                            onClick={onStartTour}
                            style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', border: '1px solid var(--accent-purple)', background: 'transparent', color: 'var(--accent-purple)' }}
                            title="Start de rondleiding opnieuw"
                        >▶ Rondleiding</button>
                    )}
                </div>

                {/* LEVEL 1 — build & adjust a worksheet end-to-end */}
                {tab === 'maken' && (
                    <>
                        <Section title="1. Oefening kiezen">
                            In de linker zijbalk, tabblad <strong>Oefeningen</strong>, klik je op een leerdomein, dan een onderdeel, dan het type oefening. Het blok verschijnt meteen op het blad in het midden. Wil je er meerdere tegelijk? Gebruik <strong>Toevoegen</strong> bovenaan — daar zoek je en zie je een voorbeeld van elk type.
                        </Section>
                        <Section title="2. Het blok aanpassen">
                            Klik op een blok om het <strong>rechterpaneel</strong> te openen. Daar stel je in: aantal oefeningen, getalbereik (maximum getal), getalsoort, niveau/moeilijkheid, en voor hoofdrekenen/cijferen ook de getalopbouw en de bruggetjes. Onder <strong>Geavanceerd</strong> vind je witruimte en tekstgrootte van het blok.
                        </Section>
                        <Section title="3. Genereren">
                            Klik op <strong>Genereer</strong> in het blok-paneel om de getallen te maken of te vernieuwen. <strong>Genereer alles</strong> bovenaan vernieuwt elk blok in één klik. Vergrendel een blok met het <strong>slotje</strong> zodat het overgeslagen wordt bij Genereer alles — handig voor blokken die je met de hand aanpaste.
                        </Section>
                        <Section title="4. Het blad opmaken">
                            Klik op een lege plek naast de blokken (of deselecteer) → het rechterpaneel toont de <strong>documentinstellingen</strong>: titel en titelpositie, koptekst (naam/klas/nummer/datum), voettekst, scores tonen, en de opdracht-stijl. Via <strong>Stijl aanpassen</strong> regel je lettergrootte, kleur en opvulling per zone.
                        </Section>
                        <Section title="5. Overzicht en ordenen">
                            Het tabblad <strong>Overzicht</strong> (links) toont alle blokken op een rij. Versleep om te herordenen, dupliceer of verwijder een blok, en zie waar de pagina’s eindigen. Klik op een rij om naar dat blok op het blad te springen.
                        </Section>
                        <Section title="6. Thema en voorbeelden">
                            Onder <strong>⚙ Instellingen</strong> bovenaan kies je het thema (licht, donker, hoog contrast) en zet je <strong>Voorbeeld bij zweven</strong> aan of uit (een voorbeeldkaartje wanneer je over een oefening in de lijst zweeft).
                        </Section>
                        <Section title="7. Afdrukken of als PDF">
                            Klik op <strong>Afdrukken</strong> bovenaan (of Ctrl+P) en kies in je browser “Opslaan als PDF”. Met <strong>Oplossingen</strong> druk je de antwoorden mee af. Wat je op het scherm ziet, is precies wat afgedrukt wordt.
                        </Section>
                    </>
                )}

                {/* LEVEL 2 — save / load / presets */}
                {tab === 'opslaan' && (
                    <>
                        <Section title="1. Automatisch bewaard">
                            Je werk wordt voortdurend in je browser bewaard — bovenaan zie je de chip <strong>Automatisch bewaard</strong>. Sluit je per ongeluk het tabblad, dan staat alles er nog wanneer je terugkomt.
                        </Section>
                        <Section title="2. Mijn bladen">
                            Via <strong>≡ Menu → Mijn bladen</strong> open je je eigen bibliotheek. Bewaar het huidige blad, of open, hernoem, dupliceer en verwijder een bewaard blad. Elk blad krijgt een miniatuur. Je kan tot 50 bladen bewaren.
                        </Section>
                        <Section title="3. Kant-en-klare bladen">
                            Via <strong>≡ Menu → Kant-en-klare bladen</strong> kies je een kant-en-klaar voorbeeldblad. Filter op leerjaar, rekenmethode of domein. <strong>Gebruik sjabloon</strong> laadt het blad in de editor — daarna pas je het vrij aan en bewaar je het bij Mijn bladen.
                        </Section>
                        <Section title="4. Bestand bewaren en openen">
                            <strong>≡ Menu → Exporteren…</strong> bewaart het blad als <strong>.rekenraak</strong>-bestand op je computer (een back-up of om door te sturen). <strong>Importeren…</strong> opent zo’n bestand opnieuw (ook oudere .json-bestanden werken nog).
                        </Section>
                    </>
                )}

                {/* LEVEL 3 — share */}
                {tab === 'delen' && (
                    <>
                        <Section title="1. Een link delen">
                            Via <strong>≡ Menu → Delen</strong> heb je twee opties. <strong>Blad delen</strong> maakt een link met de volledige werkbundel (oefeningen én de gegenereerde getallen). <strong>Sjabloon delen</strong> deelt enkel de instellingen, zonder getallen — wie de link opent, genereert zelf verse oefeningen met dezelfde opbouw.
                        </Section>
                        <Section title="2. Een bestand delen">
                            Liever offline? <strong>≡ Menu → Exporteren…</strong> geeft je een .rekenraak-bestand dat je via mail of een gedeelde map doorstuurt. De ontvanger opent het met <strong>Importeren…</strong>.
                        </Section>
                        <Section title="3. Een curriculum delen (leerkrachten)">
                            Via <strong>⚙ Instellingen → Curriculum samenstellen</strong> kies je welke oefentypes toegestaan zijn en zet je per type de moeilijkheid vast. Klik op <strong>Deel curriculum-link</strong>: wie die link opent, kan enkel oefeningen uit jouw lijst toevoegen, het aantal aanpassen en opnieuw genereren — de moeilijkheidsgraad ligt vast. Ideaal om een lijst per handboek of klas te delen.
                        </Section>
                        <Section title="Bugs of suggesties?">
                            Laat het me weten via het <a href="https://forms.gle/jc1LcMXaRG3V3M556" target="_blank" rel="noopener noreferrer" style={linkStyle}>contactformulier</a> (⚙ Instellingen → Feedback geven).
                        </Section>
                    </>
                )}
            </div>
        </div>
        </ModalPortal>
    );
}

const linkStyle: React.CSSProperties = { color: 'var(--accent-purple)', textDecoration: 'underline' };

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '12px', color: 'var(--accent-purple)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-muted)', margin: 0 }}>{children}</p>
        </div>
    );
}
