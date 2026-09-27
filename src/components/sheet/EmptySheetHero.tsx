import { ListChecks, SlidersHorizontal, Flask, Hand, Lock, Printer } from '@phosphor-icons/react';
import { styles } from '../../styles/appStyles';

// The empty sheet explains itself; it disappears with the first block.
export default function EmptySheetHero() {
  return (
    <div className="no-print" style={{ ...styles.heroEmpty, width: '100%' }}>
      <h1 style={styles.heroTitle}>Zo maak je een rekenblad</h1>
      <p style={styles.heroPitch}>
        Dit blad is nog leeg. Deze uitleg verdwijnt zodra je links een eerste oefening toevoegt.
        Wat je hier op het scherm ziet, is exact wat er straks uit de printer komt.
      </p>
      <ol style={styles.heroSteps}>
        <li style={styles.heroStep}>
          <span style={styles.heroStepIcon}><ListChecks size={20} weight="bold" /></span>
          <div>
            <p style={styles.heroStepTitle}>1. Kies een oefening</p>
            <p style={styles.heroStepBody}>Links staan alle oefeningen per domein, geordend zoals het leerplan. Zoek op naam of filter op leerjaar met het menu naast het zoekveld. Eén klik zet een blok op het blad.</p>
          </div>
        </li>
        <li style={styles.heroStep}>
          <span style={styles.heroStepIcon}><SlidersHorizontal size={20} weight="bold" /></span>
          <div>
            <p style={styles.heroStepTitle}>2. Stel het blok in</p>
            <p style={styles.heroStepBody}>Rechts kies je aantal, getalbereik, met of zonder brug, hulpjes en niveau. De prefix MAG / MOET / ★ zet differentiatie in de opdrachttitel.</p>
          </div>
        </li>
        <li style={styles.heroStep}>
          <span style={styles.heroStepIcon}><Flask size={20} weight="bold" /></span>
          <div>
            <p style={styles.heroStepTitle}>3. Genereer</p>
            <p style={styles.heroStepBody}>Elke klik geeft andere getallen; "Genereer alles" doet het hele blad in één keer. Past een opgave niet? Klik erop en verander ze zelf. Vergrendel een blok dat goed zit.</p>
          </div>
        </li>
        <li style={styles.heroStep}>
          <span style={styles.heroStepIcon}><Hand size={20} weight="bold" /></span>
          <div>
            <p style={styles.heroStepTitle}>4. Schik het blad</p>
            <p style={styles.heroStepBody}>Zet een blok vol, half of kwart breed, sleep het naar de juiste plaats of laat het op een nieuwe pagina beginnen. Het tabblad Overzicht toont alle blokken op een rij.</p>
          </div>
        </li>
        <li style={styles.heroStep}>
          <span style={styles.heroStepIcon}><Lock size={20} weight="bold" /></span>
          <div>
            <p style={styles.heroStepTitle}>5. Werk af</p>
            <p style={styles.heroStepBody}>Onder Blad regel je naam- en klasvelden, titel, voettekst, nummering en scores. Onder Opmaak de lettergrootte en de ruimte tussen de blokken.</p>
          </div>
        </li>
        <li style={styles.heroStep}>
          <span style={styles.heroStepIcon}><Printer size={20} weight="bold" /></span>
          <div>
            <p style={styles.heroStepTitle}>6. Druk af</p>
            <p style={styles.heroStepBody}>Printknop of Ctrl+P, marges op "Geen", of bewaar als pdf. Zet het oogje aan om de oplossingen in het rood te tonen en druk die versie apart af.</p>
          </div>
        </li>
      </ol>
      <p style={styles.heroTipsTitle}>Goed om te weten</p>
      <ul style={styles.heroTips}>
        <li>Je blad wordt automatisch bewaard in deze browser. Wil je het meenemen of bijhouden, bewaar het dan als bestand via "Meer".</li>
        <li>Een deellink opent bij een collega exact dit blad; een sjabloonlink geeft alleen de instellingen door, zodat elke klas andere getallen krijgt.</li>
        <li>Geen tijd? Onder "Meer" staan kant-en-klare bladen per leerjaar om van te vertrekken.</li>
        <li>Met "Geen dubbele oefeningen" komt een opgave nergens op het blad twee keer voor.</li>
        <li>De rondleiding en de video vind je terug achter de knop met het vraagteken.</li>
      </ul>
      <p style={styles.heroHint}>Gratis, zonder account. Niets verlaat je browser tenzij je zelf afdrukt of deelt.</p>
    </div>
  );
}
