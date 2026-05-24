import React from 'react';

export const sharedPluginStyles = {
    container: {
        borderTop: '1px solid var(--border-color)',
        paddingTop: '20px',
        marginTop: '16px' // Handig voor consistentie met de rest van de zijbalk
    } as React.CSSProperties,

    section: {
        marginBottom: '24px'
    } as React.CSSProperties,

    label: {
        display: 'block',
        fontSize: '13px',
        color: 'var(--text-muted)',
        marginBottom: '8px'
    } as React.CSSProperties,

    buttonGroup: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap' // Zorgt dat het netjes op een nieuwe regel breekt als de zijbalk krap wordt
    } as React.CSSProperties,

    radioBtn: (active: boolean): React.CSSProperties => ({
        flex: 1,
        padding: '8px 12px',
        fontSize: '11px',
        borderRadius: '4px',
        cursor: 'pointer',
        border: '1px solid var(--border-color)',
        backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)',
        color: active ? 'white' : 'var(--text-muted)',
        fontWeight: active ? 'bold' : 'normal',
        textAlign: 'center',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    })
};