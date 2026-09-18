import { LegalPageLayout } from '@/components/LegalPageLayout';

export default function Imprint() {
  return (
    <LegalPageLayout
      title="Impressum"
      description="Anbieterkennzeichnung und Kontakt für Synapse."
      updated="4. August 2026"
    >
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p className="mt-3">
          <strong>Maximiliano Coloma-Seegers</strong><br />
          Einzelunternehmen<br />
          Synapse<br />
          Isselbruch 1<br />
          46499 Hamminkeln<br />
          Deutschland
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p className="mt-3">
          E-Mail: <a href="mailto:max@coloma.de">max@coloma.de</a>
        </p>
      </section>

      <section>
        <h2>Unternehmensangaben</h2>
        <p className="mt-3">
          Rechtsform: Einzelunternehmen (Kleingewerbe)<br />
          Es besteht keine Eintragung im Handelsregister.<br />
          Kleinunternehmer gemäß § 19 UStG; eine Umsatzsteuer-Identifikationsnummer ist nicht vorhanden.
        </p>
      </section>

      <section>
        <h2>Verantwortlich für journalistisch-redaktionelle Inhalte</h2>
        <p className="mt-3">
          Verantwortlich gemäß § 18 Abs. 2 MStV:<br />
          Maximiliano Coloma-Seegers, Isselbruch 1, 46499 Hamminkeln
        </p>
      </section>

      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p className="mt-3">
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>
    </LegalPageLayout>
  );
}
