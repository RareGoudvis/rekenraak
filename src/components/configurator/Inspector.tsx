import { useWorksheetStore } from '../../store/useWorksheetStore';
import AdditionConfig from './plugins/AdditionConfig';
import SubtractionConfig from './plugins/SubtractionConfig';
import MultiplicationConfig from './plugins/MultiplicationConfig';
import { generateAdditionExercises, generateSubtractionExercises, generateMultiplicationExercises } from '../../services/math/mathEngine';

export default function Inspector() {
    const activeBlockId = useWorksheetStore((state) => state.activeBlockId);
    const activeBlock = useWorksheetStore((state) => state.blocks.find(b => b.id === activeBlockId));

    const headerData = useWorksheetStore((state) => state.header);
    const footerData = useWorksheetStore((state) => state.footer);
    const updateHeader = useWorksheetStore((state) => state.updateHeader);
    const updateFooter = useWorksheetStore((state) => state.updateFooter);
    const setBlockExercises = useWorksheetStore((state) => state.setBlockExercises);

    const handleGenerateExercises = () => {
        if (!activeBlock) return;
        let newExercises: any[] = [];

        if (activeBlock.typeId.includes('optellen')) {
            newExercises = generateAdditionExercises(activeBlock);
        } else if (activeBlock.typeId.includes('aftrekken')) {
            newExercises = generateSubtractionExercises(activeBlock);
        } else if (activeBlock.typeId.includes('vermenigvuldigen')) {
            newExercises = generateMultiplicationExercises(activeBlock);
        }

        setBlockExercises(activeBlock.id, newExercises);
    };

    // SCENARIO A: Document niveau geselecteerd
    if (activeBlockId === 'document') {
        return (
            <aside style={styles.sidebar}>
                <h3 style={styles.mainTitle}>Algemene Instellingen</h3>

                <div style={styles.card}>
                    <h4 style={styles.cardTitle}>Werkbundel Titel</h4>
                    <div style={styles.flexColumn}>
                        <label style={styles.label}>Titel van het document</label>
                        <input style={styles.input} value={headerData.titel || ''} onChange={(e) => updateHeader({ titel: e.target.value })} placeholder="Bv. Herhalingstoets" />
                    </div>
                </div>

                <div style={styles.card}>
                    <h4 style={styles.cardTitle}>Koptekst (Bovenaan)</h4>
                    <div style={styles.flexColumn}>
                        <label style={styles.checkboxLabel}><input type="checkbox" checked={headerData.naam} onChange={(e) => updateHeader({ naam: e.target.checked })} style={styles.checkbox} /> Naam tonen</label>
                        <label style={styles.checkboxLabel}><input type="checkbox" checked={headerData.klas} onChange={(e) => updateHeader({ klas: e.target.checked })} style={styles.checkbox} /> Klas tonen</label>
                        <label style={styles.checkboxLabel}><input type="checkbox" checked={headerData.nummer} onChange={(e) => updateHeader({ nummer: e.target.checked })} style={styles.checkbox} /> Nummer (Nr.) tonen</label>
                        <label style={styles.checkboxLabel}><input type="checkbox" checked={headerData.datum} onChange={(e) => updateHeader({ datum: e.target.checked })} style={styles.checkbox} /> Datum tonen</label>
                    </div>
                </div>

                <div style={styles.card}>
                    <h4 style={styles.cardTitle}>Voettekst (Onderaan)</h4>
                    <div style={styles.flexColumn}>
                        <div><label style={styles.label}>School</label><input style={styles.input} value={footerData.school || ''} onChange={(e) => updateFooter({ school: e.target.value })} placeholder="Bv. VBS De Vlinder" /></div>
                        <div><label style={styles.label}>Klas</label><input style={styles.input} value={footerData.klas || ''} onChange={(e) => updateFooter({ klas: e.target.value })} placeholder="Bv. L3a" /></div>
                        <div><label style={styles.label}>Leerkracht</label><input style={styles.input} value={footerData.leerkracht || ''} onChange={(e) => updateFooter({ leerkracht: e.target.value })} placeholder="Bv. Meester Ruben" /></div>
                    </div>
                </div>
            </aside>
        );
    }

    // SCENARIO B: Helemaal niets geselecteerd
    if (!activeBlock) {
        return (
            <aside style={{ ...styles.sidebar, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>Selecteer een oefening of het document.</p>
            </aside>
        );
    }

    // SCENARIO C: Wiskundeblok is geselecteerd
    return (
        <aside style={styles.sidebar}>
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Wiskunde Engine</h3>

                {activeBlock.typeId.includes('optellen') && <AdditionConfig block={activeBlock} />}
                {activeBlock.typeId.includes('aftrekken') && <SubtractionConfig block={activeBlock} />}
                {activeBlock.typeId.includes('vermenigvuldigen') && <MultiplicationConfig block={activeBlock} />}

                <button onClick={handleGenerateExercises} style={styles.generateBtn}>✨ Genereer oefeningen</button>
            </div>
        </aside>
    );
}

// ============================================================================
// LOKALE STYLES
// ============================================================================
const styles = {
    sidebar: { width: '380px', minWidth: '380px', backgroundColor: 'var(--bg-dark)', borderLeft: '1px solid var(--border-color)', height: '100%', boxSizing: 'border-box', overflowY: 'auto', padding: '20px' } as React.CSSProperties,
    mainTitle: { color: 'var(--text-main)', marginTop: 0, marginBottom: '24px', fontSize: '18px' } as React.CSSProperties,
    card: { backgroundColor: 'var(--bg-panel)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' } as React.CSSProperties,
    cardTitle: { color: 'var(--accent-purple)', margin: '0 0 16px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' } as React.CSSProperties,
    label: { display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' } as React.CSSProperties,
    input: { width: '100%', padding: '10px', backgroundColor: '#1a1a1f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', outline: 'none', boxSizing: 'border-box', fontSize: '13px' } as React.CSSProperties,
    flexColumn: { display: 'flex', flexDirection: 'column', gap: '6px' } as React.CSSProperties,
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)', marginBottom: '8px' } as React.CSSProperties,
    checkbox: { accentColor: 'var(--accent-purple)', width: '16px', height: '16px', cursor: 'pointer' } as React.CSSProperties,
    generateBtn: { width: '100%', padding: '14px', backgroundColor: 'var(--accent-purple)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s', marginTop: '16px', boxShadow: '0 4px 12px rgba(155, 48, 255, 0.3)' } as React.CSSProperties,
};