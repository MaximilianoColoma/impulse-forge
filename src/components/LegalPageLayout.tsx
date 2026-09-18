import type { ReactNode } from 'react';
import { ArrowLeft, Brain } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { PublicFooter } from '@/components/PublicFooter';

interface LegalPageLayoutProps {
  title: string;
  description: string;
  updated: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, description, updated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 text-foreground">
      <Helmet>
        <title>{title} | Synapse</title>
        <meta name="description" content={description} />
      </Helmet>

      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 font-bold" aria-label="Synapse Startseite">
            <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
            Synapse
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Zur Startseite
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
        <div className="mb-10 border-b pb-8">
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Stand: {updated}</p>
        </div>
        <article className="space-y-9 leading-7 [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_strong]:text-foreground">
          {children}
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
