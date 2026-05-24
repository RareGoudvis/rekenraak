import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { MathBlock, Fraction } from '../../services/math/types';

// =========================================================================
// 1. PDF-SPECIFIEKE STIJLEN (A4 Maatvoering in PT)
// =========================================================================
const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Helvetica', fontSize: 12 },

    // Document Hoofdtitel
    titleContainer: { width: '100%', textAlign: 'center', marginBottom: 20 },
    titleText: { fontSize: 22, fontWeight: 'bold' },

    // Koptekst Leerlingvelden Layout
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 35 },
    headerFieldsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, maxWidth: '75%' },
    headerField: { flexDirection: 'row', alignItems: 'flex-end', height: 20 },
    headerText: { fontSize: 12, fontWeight: 'bold' },
    headerLine: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', marginLeft: 4, minWidth: 40 },

    // Didactisch Scorebord
    scoreBox: { borderWidth: 2, borderColor: '#000', padding: '6px 12px', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
    scoreText: { fontSize: 13, fontWeight: 'bold' },

    // Oefeningenblokken & Kolommen (50% breedte voor 2 kolommen)
    blockContainer: { marginBottom: 25 },
    blockTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    exerciseCell: { width: '50%', flexDirection: 'row', alignItems: 'center', marginBottom: 15 },

    textNormal: { fontSize: 14 },
    textSolution: { fontSize: 14, color: '#e11d48', fontWeight: 'bold' },

    // Verticale Breuk Lay-out met stabiele breedte
    fractionWrapper: { flexDirection: 'column', alignItems: 'center', marginHorizontal: 4 },
    fractionTop: { borderBottomWidth: 1, borderBottomColor: '#000', paddingHorizontal: 2, textAlign: 'center', minWidth: 24 },
    fractionBottom: { paddingHorizontal: 2, textAlign: 'center', minWidth: 24 },
    wholeNumberStyle: { fontSize: 16, marginRight: 2, fontWeight: 'bold' },

    // Vastgezette Voettekst
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 10 },
    footerText: { fontSize: 10, color: '#444' }
});

// Junior-tip: Type Guard om runtime te controleren of een waarde een Breuk is
const isFraction = (val: any): val is Fraction => {
    return typeof val === 'object' && val !== null && 'n' in val;
};

interface Props {
    blocks: MathBlock[];
    headerData: {
        naam: boolean;
        klas: boolean;
        nummer: boolean;
        datum: boolean;
        titel: string;
    };
    footerData: {
        school: string;
        klas: string;
        leerkracht: string;
    };
    showSolutions: boolean;
}

export const WorksheetPDF = ({ blocks, headerData, footerData, showSolutions }: Props) => {
    // Bereken de maximale score dynamisch over de hele bundel heen
    const totalScore = blocks.reduce((sum, block) => sum + block.totalPoints, 0);

    // Sub-render: Tekent de getallen of verticale schoolbreuken (inclusief gemengde getallen)
    const renderTerm = (val: number | Fraction) => {
        if (isFraction(val)) {
            const hasWhole = val.whole !== undefined && val.whole > 0;
            const hasFraction = val.n > 0;
            return (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {hasWhole && <Text style={styles.wholeNumberStyle}>{val.whole}</Text>}
                    {hasFraction && (
                        <View style={styles.fractionWrapper}>
                            <Text style={styles.fractionTop}>{val.n}</Text>
                            <Text style={styles.fractionBottom}>{val.d}</Text>
                        </View>
                    )}
                </View>
            );
        }
        return <Text style={styles.textNormal}>{val}</Text>;
    };

    // Sub-render: Tekent het antwoord (inclusief rode kleur bij de oplossingsbundel)
    const renderAnswer = (val: number | Fraction) => {
        if (isFraction(val)) {
            const hasWhole = val.whole !== undefined && val.whole > 0;
            const hasFraction = val.n > 0;
            return (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {hasWhole && <Text style={[styles.wholeNumberStyle, { color: '#e11d48' }]}>{val.whole}</Text>}
                    {hasFraction && (
                        <View style={styles.fractionWrapper}>
                            <Text style={[styles.fractionTop, { borderBottomColor: '#e11d48', color: '#e11d48' }]}>{val.n}</Text>
                            <Text style={{ ...styles.fractionBottom, color: '#e11d48' }}>{val.d}</Text>
                        </View>
                    )}
                </View>
            );
        }
        return <Text style={styles.textSolution}>{val}</Text>;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* DEEL 1: DYNAMISCHE DOCUMENT TITEL (Bovenaan gecentreerd) */}
                {headerData.titel ? (
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>{headerData.titel}</Text>
                    </View>
                ) : null}

                {/* DEEL 2: DYNAMISCHE KOPTEKST (Gebaseerd op de switches in je store) */}
                <View style={styles.headerRow}>
                    <View style={styles.headerFieldsWrapper}>
                        {headerData.naam && (
                            <View style={[styles.headerField, { width: 220 }]}>
                                <Text style={styles.headerText}>Naam:</Text>
                                <View style={styles.headerLine} />
                            </View>
                        )}
                        {headerData.klas && (
                            <View style={[styles.headerField, { width: 80 }]}>
                                <Text style={styles.headerText}>Klas:</Text>
                                <View style={styles.headerLine} />
                            </View>
                        )}
                        {headerData.nummer && (
                            <View style={[styles.headerField, { width: 70 }]}>
                                <Text style={styles.headerText}>Nr:</Text>
                                <View style={styles.headerLine} />
                            </View>
                        )}
                        {headerData.datum && (
                            <View style={[styles.headerField, { width: 130 }]}>
                                <Text style={styles.headerText}>Datum:</Text>
                                <View style={styles.headerLine} />
                            </View>
                        )}
                    </View>

                    {/* Scorebord: Alleen zichtbaar als er effectief punten verdeeld zijn */}
                    {totalScore > 0 && (
                        <View style={styles.scoreBox}>
                            <Text style={styles.scoreText}>Score:      / {totalScore}</Text>
                        </View>
                    )}
                </View>

                {/* DEEL 3: EXERCISES GENERATIE LOOP */}
                {blocks.map((block) => (
                    // wrap={false} dwingt de PDF-engine om opdrachten nooit halverwege een pagina af te breken!
                    <View key={block.id} style={styles.blockContainer} wrap={false}>
                        <Text style={styles.blockTitle}>{block.instructionText}</Text>

                        <View style={styles.gridContainer}>
                            {block.exercises.map((ex) => (
                                <View key={ex.id} style={styles.exerciseCell}>
                                    {renderTerm(ex.operands[0])}
                                    <Text style={{ marginHorizontal: 6 }}>{ex.operator}</Text>
                                    {renderTerm(ex.operands[1])}
                                    <Text style={{ marginHorizontal: 6 }}> = </Text>

                                    {showSolutions ? (
                                        renderAnswer(ex.answer)
                                    ) : (
                                        <Text style={{ letterSpacing: 2 }}>........</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                ))}

                {/* DEEL 4: DYNAMISCHE VOETTEKST MET NATIVE PAGINANUMMERS */}
                {/* De 'fixed' prop zorgt ervoor dat dit blok op ELKE gegenereerde pagina terugkeert */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        {(footerData.school || 'School')}  |  {(footerData.klas || 'Klas')}  |  {(footerData.leerkracht || 'Leerkracht')}
                    </Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
                        `Pagina ${pageNumber} / ${totalPages}`
                    )} />
                </View>

            </Page>
        </Document>
    );
};