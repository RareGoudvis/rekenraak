// Daily-routine widget: today's date in full Dutch (nl-BE), teacher-board style.
export default function DatumWidget({ dark }: { dark: boolean }) {
    const now = new Date();
    const weekday = now.toLocaleDateString('nl-BE', { weekday: 'long' });
    const rest = now.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
    return (
        <div style={{
            padding: '16px 20px', borderRadius: '10px', textAlign: 'center',
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(30,64,175,0.06)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(30,64,175,0.25)'}`,
            color: dark ? '#fff' : '#111', fontFamily: "'Azeret Mono', monospace",
        }}>
            <div style={{ fontSize: '30px', fontWeight: 700, textTransform: 'capitalize' }}>{weekday}</div>
            <div style={{ fontSize: '22px', marginTop: '4px' }}>{rest}</div>
        </div>
    );
}
