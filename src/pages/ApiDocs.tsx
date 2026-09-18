import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function ApiDocs() {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Code kopiert!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative group">
      <pre className="bg-card border border-border rounded-lg p-4 overflow-x-auto text-sm">
        <code className="text-foreground">{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copyCode(code, id)}
      >
        {copiedCode === id ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  const projectUrl = import.meta.env.VITE_SUPABASE_URL;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Synapse API Dokumentation</h1>
            <p className="text-muted-foreground mt-1">Version 1.0.0</p>
          </div>
        </div>

        {/* Einleitung */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-primary">Was ist die Synapse API?</h2>
          <p className="text-foreground leading-relaxed">
            Die Synapse API ermöglicht es externen Anwendungen, Impulse (Ideen, Aufgaben) direkt in den Workspace eines Benutzers zu schieben.
          </p>
          <p className="text-foreground leading-relaxed">
            <strong className="text-primary">Anwendungsfall:</strong> Der primäre Anwendungsfall ist die Integration in CRM-Systeme wie Centraly, um "gelbe Zettel" zu vermeiden und Gedanken direkt im Arbeitskontext festzuhalten.
          </p>
        </Card>

        {/* Authentifizierung */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-primary">Sichere Anfragen mit API-Tokens</h2>
          <p className="text-foreground leading-relaxed">
            Alle Anfragen müssen mit einem JWT im <code className="bg-muted px-2 py-1 rounded">Authorization: Bearer &lt;token&gt;</code> Header gesichert werden.
          </p>
          <div className="space-y-3">
            <p className="text-foreground">
              <strong>Token generieren:</strong> Benutzer können ihren persönlichen API-Token in den{" "}
              <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate("/settings")}>
                Synapse-Einstellungen
              </span>{" "}
              generieren.
            </p>
            <p className="text-muted-foreground text-sm">
              ⚠️ Der Token ist ein Jahr gültig und sollte wie ein Passwort behandelt werden.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Beispiel Header:</p>
            <CodeBlock
              id="auth-header"
              code={`curl -H "Authorization: Bearer dein_token_hier" \\
  ${projectUrl}/functions/v1/create-impulse-api`}
            />
          </div>
        </Card>

        {/* Core Endpoint: Impuls erstellen */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-primary">Core-Endpoint: Einen Impuls erstellen</h2>
          
          <div className="bg-muted/30 p-3 rounded-lg">
            <code className="text-foreground font-mono text-sm">
              POST {projectUrl}/functions/v1/create-impulse-api
            </code>
          </div>

          <p className="text-foreground leading-relaxed">
            Dieser Endpunkt ist das Herzstück der Integration. Er nimmt einen Impuls entgegen, findet oder erstellt das zugehörige Projekt und speichert den Impuls in Synapse.
          </p>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Request Body</h3>
            <CodeBlock
              id="request-body"
              code={`{
  "text": "Idee zu Kunde Müller: Video-Tutorial erstellen",
  "context": {
    "type": "kontakt",
    "id": "c4a7f8b0-1234-5678-9101-112131415161",
    "name": "Kunde Müller"
  },
  "user": {
    "email": "max@firma.de"
  }
}`}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Feld-Beschreibungen:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded text-primary flex-shrink-0">text</code>
                <span className="text-foreground">
                  <strong>(erforderlich)</strong> - Der eigentliche Inhalt des Impulses.
                </span>
              </li>
              <li className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded text-primary flex-shrink-0">context.type</code>
                <span className="text-foreground">
                  <strong>(erforderlich)</strong> - 'kontakt', 'projekt' oder 'allgemein'.
                </span>
              </li>
              <li className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded text-primary flex-shrink-0">context.id</code>
                <span className="text-foreground">
                  <strong>(erforderlich)</strong> - Die UUID des Kontakts/Projekts im Quellsystem.
                </span>
              </li>
              <li className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded text-primary flex-shrink-0">context.name</code>
                <span className="text-foreground">
                  <strong>(erforderlich)</strong> - Der Name, der für das Projekt in Synapse verwendet wird.
                </span>
              </li>
              <li className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded text-primary flex-shrink-0">user.email</code>
                <span className="text-foreground">
                  <strong>(erforderlich)</strong> - Die E-Mail des Synapse-Benutzers.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <p className="text-sm text-foreground">
              <strong className="text-success">💡 Intelligentes Verhalten:</strong> Wenn ein Projekt mit dem{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">context.name</code> nicht existiert, wird es automatisch für den Benutzer erstellt.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Erfolgs-Response (201 Created)</h3>
            <CodeBlock
              id="success-response"
              code={`{
  "id": "a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
  "text": "Idee zu Kunde Müller: Video-Tutorial erstellen",
  "status": "unprocessed",
  "createdAt": "2025-10-16T10:00:00Z"
}`}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Fehler-Responses</h3>
            <div className="space-y-3">
              <div>
                <p className="font-mono text-sm text-destructive mb-2">401 Unauthorized</p>
                <CodeBlock
                  id="error-401"
                  code={`{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}`}
                />
                <p className="text-sm text-muted-foreground mt-2">Ungültiger oder fehlender Token.</p>
              </div>
              <div>
                <p className="font-mono text-sm text-destructive mb-2">400 Bad Request</p>
                <CodeBlock
                  id="error-400"
                  code={`{
  "error": "Bad Request",
  "message": "Missing required fields: text, context, user"
}`}
                />
                <p className="text-sm text-muted-foreground mt-2">Fehlende oder ungültige Daten im Request Body.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Vollständiges Beispiel */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-primary">Vollständiges Beispiel</h2>
          <p className="text-foreground">Ein komplettes cURL-Beispiel für die Integration:</p>
          <CodeBlock
            id="full-example"
            code={`curl -X POST ${projectUrl}/functions/v1/create-impulse-api \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer dein_token_hier" \\
  -d '{
    "text": "Idee zu Kunde Müller: Video-Tutorial erstellen",
    "context": {
      "type": "kontakt",
      "id": "c4a7f8b0-1234-5678-9101-112131415161",
      "name": "Kunde Müller"
    },
    "user": {
      "email": "max@firma.de"
    }
  }'`}
          />
        </Card>

        {/* Changelog */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-primary">Changelog & Versionierung</h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">v1.0.0 (Aktuell)</h3>
              <p className="text-sm text-muted-foreground mb-2">16. Oktober 2025</p>
              <ul className="space-y-1 text-sm text-foreground">
                <li className="flex gap-2">
                  <span className="text-success">✓</span>
                  <span><strong>HINZUGEFÜGT:</strong> <code className="bg-muted px-1.5 py-0.5 rounded text-xs">POST /api/impulses</code> Endpunkt zur Erstellung von Impulsen.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-success">✓</span>
                  <span><strong>HINZUGEFÜGT:</strong> Automatische Projekterstellung basierend auf dem Kontext.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-success">✓</span>
                  <span><strong>HINZUGEFÜGT:</strong> JWT-basierte Authentifizierung mit API-Tokens.</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pb-6">
          <p>Fragen? Kontaktiere uns oder besuche die <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate("/settings")}>Einstellungen</span>.</p>
        </div>
      </div>
    </div>
  );
}
