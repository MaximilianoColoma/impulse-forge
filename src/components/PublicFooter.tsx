import { Brain } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <footer className="border-t bg-background/80">
      <div className="container mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 font-bold" aria-label="Synapse Startseite">
            <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
            Synapse
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            Ein Angebot von Maximiliano Coloma-Seegers.
          </p>
        </div>

        <nav aria-label="Rechtliches und Kontakt" className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
          <Link to="/pricing" className="transition-colors hover:text-foreground">Preise</Link>
          <Link to="/beta-bedingungen" className="transition-colors hover:text-foreground">Beta-Bedingungen</Link>
          <Link to="/datenschutz" className="transition-colors hover:text-foreground">Datenschutz</Link>
          <Link to="/impressum" className="transition-colors hover:text-foreground">Impressum</Link>
          <a href="mailto:max@coloma.de" className="transition-colors hover:text-foreground">Kontakt</a>
        </nav>
      </div>
      <div className="container mx-auto max-w-6xl px-4 pb-8 text-sm text-muted-foreground">
        © {new Date().getFullYear()} Synapse
      </div>
    </footer>
  );
}
