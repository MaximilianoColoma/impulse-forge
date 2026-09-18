import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import Imprint from '../Imprint';
import Privacy from '../Privacy';
import BetaTerms from '../BetaTerms';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('public legal pages', () => {
  it('shows the approved sole proprietor details without broker-specific content', () => {
    const { container } = renderWithProviders(<Imprint />);

    expect(screen.getAllByText(/Maximiliano Coloma-Seegers/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Isselbruch 1/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'max@coloma.de' }).length).toBeGreaterThan(0);
    expect(container).not.toHaveTextContent(/Makler|§ 34c|MaBV|Aufsichtsbehörde/i);
  });

  it('describes the actual data processors and keeps live payments inactive', () => {
    renderWithProviders(<Privacy />);

    expect(screen.getByText(/eigenen Server/)).toBeInTheDocument();
    expect(screen.getByText(/private Tailscale-Netz/)).toBeInTheDocument();
    expect(screen.getByText(/Für Datenbank, Authentifizierung, Dateispeicher/)).toBeInTheDocument();
    expect(screen.getByText(/keine Impuls- oder Projektinhalte an einen externen KI-Modellanbieter/)).toBeInTheDocument();
    expect(screen.getByText(/keine Live-Zahlungsabwicklung/)).toBeInTheDocument();
    expect(screen.getByText(/PostHog ist im aktuellen Beta-Build noch nicht aktiviert/)).toBeInTheDocument();
    expect(screen.getByText(/EU-Cloud mit Speicherung in Frankfurt/)).toBeInTheDocument();
    expect(screen.getByText(/Session Replay ist nicht aktiviert/)).toBeInTheDocument();
  });

  it('states the zero-euro beta, termination and refund policy', () => {
    renderWithProviders(<BetaTerms />);

    expect(screen.getByText(/0 EUR/)).toBeInTheDocument();
    expect(screen.getByText(/kein kostenpflichtiges Abonnement/)).toBeInTheDocument();
    expect(screen.getByText(/jederzeit ohne Frist beenden/)).toBeInTheDocument();
    expect(screen.getByText(/keinen zu erstattenden Betrag/)).toBeInTheDocument();
  });
});
