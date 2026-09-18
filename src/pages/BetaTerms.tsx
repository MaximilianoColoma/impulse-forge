import { LegalPageLayout } from '@/components/LegalPageLayout';

export default function BetaTerms() {
  return (
    <LegalPageLayout
      title="Bedingungen der kostenlosen Beta"
      description="Leistungs-, Kündigungs- und Erstattungsregeln für die kostenlose Synapse-Beta."
      updated="4. August 2026"
    >
      <section>
        <h2>1. Anbieter und Geltungsbereich</h2>
        <p className="mt-3">
          Anbieter von Synapse ist Maximiliano Coloma-Seegers, Einzelunternehmen, Isselbruch 1,
          46499 Hamminkeln. Diese Bedingungen gelten ausschließlich für die derzeitige kostenlose Beta.
        </p>
      </section>

      <section>
        <h2>2. Beta-Leistung</h2>
        <p className="mt-3">
          Synapse ist eine noch in Entwicklung befindliche Webanwendung zur Strukturierung von Ideen,
          Projekten und Aufgaben. Funktionen können unvollständig sein, sich ändern oder zeitweise nicht
          verfügbar sein. Wir bemühen uns um einen stabilen Betrieb, schulden in der kostenlosen Beta aber
          keine bestimmte Verfügbarkeit oder unveränderte Funktionalität.
        </p>
      </section>

      <section>
        <h2>3. Kosten und Zahlungsdaten</h2>
        <p className="mt-3">
          Die Teilnahme an dieser Beta kostet <strong>0 EUR</strong>. Es ist keine Kreditkarte erforderlich,
          es wird keine Zahlung ausgelöst und es entsteht kein kostenpflichtiges Abonnement. Angezeigte spätere
          Tarife sind eine Produktvorschau und noch kein bindendes Angebot. Ein Wechsel zu einem kostenpflichtigen
          Modell erfolgt niemals automatisch, sondern nur nach gesonderter, ausdrücklicher Bestellung.
        </p>
      </section>

      <section>
        <h2>4. Beendigung und Löschung</h2>
        <p className="mt-3">
          Du kannst die Beta jederzeit ohne Frist beenden. Für die Löschung deines Kontos und deiner Daten sende
          eine E-Mail von der registrierten Adresse an <a href="mailto:max@coloma.de">max@coloma.de</a>.
          Wir können die Beta mit angemessener Vorankündigung beenden oder einschränken; bei Sicherheitsrisiken,
          Rechtsverstößen oder missbräuchlicher Nutzung kann der Zugang sofort gesperrt werden.
        </p>
      </section>

      <section>
        <h2>5. Erstattungen und Widerruf</h2>
        <p className="mt-3">
          Da in der kostenlosen Beta keine Zahlung erhoben wird, gibt es keinen zu erstattenden Betrag.
          Kostenpflichtige Verträge werden erst nach Veröffentlichung gesonderter Preis-, Kündigungs-,
          Erstattungs- und Widerrufsbedingungen angeboten. Gesetzliche Verbraucherrechte bleiben unberührt.
        </p>
      </section>

      <section>
        <h2>6. Zulässige Nutzung</h2>
        <p className="mt-3">Du darfst Synapse nicht nutzen, um:</p>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li>Rechte anderer zu verletzen oder rechtswidrige Inhalte zu verarbeiten,</li>
          <li>Sicherheitsmaßnahmen zu umgehen oder den Dienst gezielt zu stören,</li>
          <li>Schadsoftware, automatisierte Last oder missbräuchliche Anfragen zu verbreiten,</li>
          <li>personenbezogene Daten Dritter ohne erforderliche Rechtsgrundlage einzugeben.</li>
        </ul>
      </section>

      <section>
        <h2>7. KI-Funktionen und Gesundheitshinweis</h2>
        <p className="mt-3">
          KI-Ausgaben können fehlerhaft oder unvollständig sein. Prüfe Ergebnisse eigenverantwortlich und triff
          keine wichtigen Entscheidungen allein auf ihrer Grundlage. Synapse ist kein Medizinprodukt und ersetzt
          weder Diagnose noch Behandlung oder Beratung durch qualifizierte Fachpersonen.
        </p>
      </section>

      <section>
        <h2>8. Eigene Inhalte und Datensicherung</h2>
        <p className="mt-3">
          Deine Rechte an eigenen Inhalten verbleiben bei dir. Du räumst uns nur die zur technischen
          Bereitstellung erforderlichen Nutzungsrechte ein. Da es sich um eine Beta handelt, solltest du wichtige
          Inhalte zusätzlich selbst sichern und keine ausschließlich in Synapse verfügbare Kopie aufbewahren.
        </p>
      </section>

      <section>
        <h2>9. Haftung</h2>
        <p className="mt-3">
          Wir haften unbeschränkt bei Vorsatz, grober Fahrlässigkeit sowie bei Schäden aus der Verletzung von
          Leben, Körper oder Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Pflichten ist die Haftung
          auf den typischen, vorhersehbaren Schaden begrenzt. Zwingende gesetzliche Haftung bleibt unberührt.
        </p>
      </section>

      <section>
        <h2>10. Kontakt</h2>
        <p className="mt-3">
          Fragen, Supportanliegen und Beschwerden: <a href="mailto:max@coloma.de">max@coloma.de</a>
        </p>
      </section>
    </LegalPageLayout>
  );
}
