import type { ReactNode } from 'react';
import { LegalPageLayout } from '@/components/LegalPageLayout';

const ExternalLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer">{children}</a>
);

export default function Privacy() {
  return (
    <LegalPageLayout
      title="Datenschutzerklärung"
      description="Informationen zur Verarbeitung personenbezogener Daten bei Synapse."
      updated="6. September 2026"
    >
      <section>
        <h2>1. Verantwortlicher</h2>
        <p className="mt-3">
          Maximiliano Coloma-Seegers, Einzelunternehmen<br />
          Isselbruch 1, 46499 Hamminkeln, Deutschland<br />
          E-Mail: <a href="mailto:max@coloma.de">max@coloma.de</a>
        </p>
      </section>

      <section>
        <h2>2. Wofür diese Erklärung gilt</h2>
        <p className="mt-3">
          Diese Erklärung gilt für den öffentlichen Internetauftritt und die Webanwendung Synapse.
          Synapse befindet sich in einer kostenlosen Beta. Es findet derzeit keine Live-Zahlungsabwicklung statt.
        </p>
      </section>

      <section>
        <h2>3. Aufruf der Website und Hosting</h2>
        <p className="mt-3">
          Die private PWA wird auf einem eigenen Server bereitgestellt und ist nur über das verschlüsselte
          private Tailscale-Netz erreichbar. Beim Abruf können technisch erforderliche Verbindungsdaten
          verarbeitet werden, insbesondere IP-Adresse, Zeitpunkt, aufgerufene Adresse sowie Angaben zu Browser
          und Betriebssystem. Die Verarbeitung dient der sicheren und stabilen Bereitstellung.
        </p>
        <p className="mt-3">
          Tailscale stellt den privaten verschlüsselten Netzwerkzugang bereit. Weitere Informationen enthält die{' '}
          <ExternalLink href="https://tailscale.com/privacy-policy">Datenschutzerklärung von Tailscale</ExternalLink>.
        </p>
      </section>

      <section>
        <h2>4. Konto, Authentifizierung und Anwendungsdaten</h2>
        <p className="mt-3">
          Bei Registrierung und Nutzung verarbeiten wir insbesondere E-Mail-Adresse, Anmelde- und
          Kontoinformationen sowie die von dir angelegten Arbeitsbereiche, Projekte, Aufgaben, Impulse,
          Einstellungen und sonstigen Inhalte. Die Verarbeitung ist erforderlich, um Synapse bereitzustellen
          und das Nutzungsverhältnis durchzuführen (Art. 6 Abs. 1 lit. b DSGVO).
        </p>
        <p className="mt-3">
          Für Datenbank, Authentifizierung, Dateispeicher und serverseitige Funktionen nutzen wir Supabase.
          Anbieter ist Supabase, Inc., USA, als Auftragsverarbeiter. Weitere Informationen enthält die{' '}
          <ExternalLink href="https://supabase.com/privacy">Datenschutzerklärung von Supabase</ExternalLink>.
          Für mögliche Drittlandübermittlungen werden die anwendbaren gesetzlichen Garantien vereinbart.
        </p>
      </section>

      <section>
        <h2>5. Optionale KI-Funktionen</h2>
        <p className="mt-3">
          In der privaten PWA sind optionale externe KI-Funktionen derzeit deaktiviert. Automatische Tags werden
          lokal im Browser erzeugt, die Impulssuche verwendet die geschützte Projektdatenbank und die
          Pareto-Priorisierung arbeitet deterministisch anhand von Status-, Impact-, Blocker- und
          Dringlichkeitssignalen.
        </p>
        <p className="mt-3">
          Dabei werden keine Impuls- oder Projektinhalte an einen externen KI-Modellanbieter übermittelt.
          Sollte später wieder eine optionale KI-Anbindung aktiviert werden, wird diese Erklärung vorab anhand
          des tatsächlich eingesetzten Anbieters, Datenflusses und der anwendbaren Rechtsgrundlage aktualisiert.
        </p>
      </section>

      <section>
        <h2>6. Kontaktaufnahme</h2>
        <p className="mt-3">
          Wenn du uns per E-Mail kontaktierst, verarbeiten wir deine Kontaktdaten und den Inhalt der Nachricht,
          um dein Anliegen zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO bei vertragsbezogenen
          Anfragen und andernfalls Art. 6 Abs. 1 lit. f DSGVO. Gesetzliche Aufbewahrungspflichten bleiben unberührt.
        </p>
      </section>

      <section>
        <h2>7. Zahlungen über Stripe</h2>
        <p className="mt-3">
          Die kostenlose Beta verarbeitet keine Live-Zahlungen. Sobald kostenpflichtige Angebote freigegeben
          werden, soll Stripe die Zahlungsabwicklung übernehmen. Zahlungsdaten werden dann direkt von Stripe
          verarbeitet; Synapse erhält nur die für Vertrag, Freischaltung und Abrechnung erforderlichen
          Transaktions- und Statusinformationen. Vor Aktivierung wird diese Erklärung anhand der endgültigen
          Produktionskonfiguration überprüft und erforderlichenfalls aktualisiert. Informationen bietet die{' '}
          <ExternalLink href="https://stripe.com/de/privacy">Datenschutzerklärung von Stripe</ExternalLink>.
        </p>
      </section>

      <section>
        <h2>8. Geplante Produktanalyse mit PostHog</h2>
        <p className="mt-3">
          Für die zukünftige Verbesserung von Synapse ist der Einsatz von PostHog Cloud EU zur
          Produktanalyse vorgesehen. <strong>PostHog ist im aktuellen Beta-Build noch nicht aktiviert.</strong>
          Solange die Aktivierung nicht erfolgt ist, werden durch Synapse keine Analyseereignisse an PostHog
          übertragen und keine PostHog-Cookies oder vergleichbaren Analysekennungen gesetzt.
        </p>
        <p className="mt-3">
          Nach einer späteren Aktivierung sollen ausschließlich mit deiner vorherigen Einwilligung
          pseudonyme Nutzungsereignisse verarbeitet werden. Dazu können aufgerufene Ansichten,
          Funktionsnutzung, Klickereignisse, Zeitpunkte, Referrer, Geräte- und Browserinformationen sowie
          eine pseudonyme Sitzungs- oder Nutzerkennung gehören. Zweck ist, Bedienungsprobleme zu erkennen,
          die Nutzung einzelner Funktionen zu verstehen und Synapse weiterzuentwickeln. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. a DSGVO. Die Einwilligung ist freiwillig und jederzeit mit Wirkung für die Zukunft
          widerrufbar.
        </p>
        <p className="mt-3">
          Inhalte aus Projekten, Aufgaben oder Impulsen, Passwörter, Zahlungsdaten und Gesundheitsdaten sollen
          nicht an PostHog übermittelt werden. Session Replay ist nicht aktiviert. Vor einer Aktivierung werden
          Datenerfassung und Eingabemaskierung technisch geprüft, die IP-Erfassung deaktiviert und eine
          Möglichkeit zum Erteilen und Widerrufen der Einwilligung bereitgestellt.
        </p>
        <p className="mt-3">
          Vorgesehener Auftragsverarbeiter ist PostHog Inc., USA. Für Synapse ist die EU-Cloud mit Speicherung
          in Frankfurt vorgesehen. PostHog kann im Rahmen von Betrieb und Support weitere Empfänger und
          Drittlandübermittlungen einsetzen; hierfür sind vor Aktivierung der Auftragsverarbeitungsvertrag und
          die anwendbaren Übermittlungsmechanismen zu prüfen. Weitere Informationen enthalten die{' '}
          <ExternalLink href="https://posthog.com/privacy">Datenschutzerklärung von PostHog</ExternalLink>{' '}
          und die{' '}
          <ExternalLink href="https://posthog.com/docs/privacy/gdpr-compliance">PostHog-Hinweise zur DSGVO</ExternalLink>.
        </p>
      </section>

      <section>
        <h2>9. Lokale Speicherung und Cookies</h2>
        <p className="mt-3">
          Synapse speichert technisch erforderliche Informationen lokal in deinem Browser, etwa Anmeldestatus,
          Sprache, Darstellung, aktive Arbeitsbereiche und Bedienpräferenzen. Ein funktionaler Cookie kann den
          Zustand der Seitennavigation speichern. Diese Speicherung ist für die von dir angeforderten Funktionen
          erforderlich. Wir setzen derzeit keine Werbe-, Profiling- oder externen Analyse-Cookies ein. Die
          geplante PostHog-Analyse bleibt bis zur Einwilligung vollständig deaktiviert.
        </p>
      </section>

      <section>
        <h2>10. Speicherdauer</h2>
        <p className="mt-3">
          Wir speichern personenbezogene Daten nur so lange, wie sie für die genannten Zwecke und die
          Bereitstellung des Kontos erforderlich sind oder gesetzliche Pflichten bestehen. Beta-Kontodaten
          werden nach einer berechtigten Löschanfrage gelöscht, soweit keine gesetzlichen oder sicherheitsbezogenen
          Gründe eine begrenzte weitere Speicherung verlangen.
        </p>
      </section>

      <section>
        <h2>11. Deine Rechte</h2>
        <p className="mt-3">
          Du hast nach Maßgabe der DSGVO insbesondere Rechte auf Auskunft, Berichtigung, Löschung,
          Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Eine erteilte Einwilligung
          kannst du mit Wirkung für die Zukunft widerrufen. Zur Ausübung genügt eine Nachricht an{' '}
          <a href="mailto:max@coloma.de">max@coloma.de</a>.
        </p>
        <p className="mt-3">
          Außerdem hast du das Recht, dich bei einer zuständigen Datenschutzaufsichtsbehörde zu beschweren.
        </p>
      </section>

      <section>
        <h2>12. Sicherheit und Änderungen</h2>
        <p className="mt-3">
          Wir treffen angemessene technische und organisatorische Maßnahmen zum Schutz personenbezogener Daten.
          Diese Erklärung wird angepasst, wenn sich Funktionen, Anbieter oder rechtliche Anforderungen ändern.
        </p>
      </section>
    </LegalPageLayout>
  );
}
