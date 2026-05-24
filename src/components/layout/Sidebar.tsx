import { APP_STRUCTURE } from '../../config/appstructure';
import { useWorksheetStore } from '../../store/useWorksheetStore';

export default function Sidebar() {
    const addBlockFromType = useWorksheetStore((state) => state.addBlockFromType);

    return (
        <aside style={{
            width: '280px',
            minWidth: '280px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>

            {/* Branding */}
            <div style={{ padding: '24px 20px 16px 20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)', fontWeight: 700 }}>Enderklas Builder</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Wiskundige werkbladen</p>
            </div>

            <hr style={{ border: 'none', height: '1px', backgroundColor: 'var(--border-color)', margin: '0 20px' }} />

            {/* De Boomstructuur */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {APP_STRUCTURE.map((domain) => (
                    <div key={domain.id} style={{ marginBottom: '28px' }}>

                        <h3 style={{
                            fontSize: '13px',
                            textTransform: 'uppercase',
                            color: 'var(--accent-purple)',
                            letterSpacing: '1px',
                            margin: '0 0 12px 0',
                            fontWeight: 700
                        }}>
                            {domain.label}
                        </h3>

                        {domain.subdomains.map((subdomain) => (
                            <div key={subdomain.id} style={{ marginBottom: '16px' }}>

                                <h4 style={{
                                    fontSize: '13px',
                                    margin: '0 0 6px 0',
                                    color: 'var(--text-main)',
                                    fontWeight: 600
                                }}>
                                    {subdomain.label}
                                </h4>

                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {subdomain.types.map((type) => (
                                        <li key={type.id} style={{ margin: '2px 0' }}>
                                            <button
                                                onClick={() => addBlockFromType(type.id, type.label)}
                                                style={{
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    padding: '6px 8px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--bg-input)';
                                                    e.currentTarget.style.color = 'var(--text-main)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = 'var(--text-muted)';
                                                }}
                                            >
                                                {type.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </aside>
    );
}