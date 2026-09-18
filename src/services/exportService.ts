export type ExportFormat = 'markdown' | 'csv' | 'json';
export type ExportTimeframe = 'all' | 'today' | 'week' | 'month' | 'year';

export interface ExportOptions {
  format: ExportFormat;
  filters?: {
    timeframe?: ExportTimeframe;
    projectId?: string | null;
  };
}

interface Impulse {
  id: string;
  content: string;
  tags: string[];
  status: string;
  created_at: string;
  due_date?: string | null;
  project_id?: string | null;
}

function toMarkdown(impulses: Impulse[]): string {
  const lines = ['# Synapse Export', '', `Exportiert am ${new Date().toLocaleDateString('de-DE')}`, '', '---', ''];

  for (const imp of impulses) {
    lines.push(`## ${imp.content.slice(0, 80)}`);
    lines.push('');
    lines.push(imp.content);
    lines.push('');
    if (imp.tags?.length) lines.push(`**Tags:** ${imp.tags.map(t => `\`${t}\``).join(', ')}`);
    lines.push(`**Status:** ${imp.status}`);
    lines.push(`**Erstellt:** ${new Date(imp.created_at).toLocaleDateString('de-DE')}`);
    if (imp.due_date) lines.push(`**Deadline:** ${new Date(imp.due_date).toLocaleDateString('de-DE')}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}

function toCsv(impulses: Impulse[]): string {
  const headers = ['ID', 'Inhalt', 'Tags', 'Status', 'Erstellt', 'Deadline'];
  const rows = impulses.map(imp => [
    imp.id,
    `"${imp.content.replace(/"/g, '""')}"`,
    `"${(imp.tags || []).join(', ')}"`,
    imp.status,
    new Date(imp.created_at).toLocaleDateString('de-DE'),
    imp.due_date ? new Date(imp.due_date).toLocaleDateString('de-DE') : '',
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function toJson(impulses: Impulse[]): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    version: '1.0',
    count: impulses.length,
    impulses,
  }, null, 2);
}

export function exportImpulses(impulses: Impulse[], format: ExportFormat): void;
export function exportImpulses(options: ExportOptions): Promise<void>;
export function exportImpulses(
  a: Impulse[] | ExportOptions,
  b?: ExportFormat,
): void | Promise<void> {
  if (!Array.isArray(a)) {
    // Options form: caller passes filters; we return a promise so callers can await.
    // Actual fetch is delegated to the caller-provided list in future revisions.
    return Promise.resolve(exportImpulsesInternal([], a.format));
  }
  return exportImpulsesInternal(a, b as ExportFormat);
}

function exportImpulsesInternal(impulses: Impulse[], format: ExportFormat): void {
  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'markdown':
      content = toMarkdown(impulses);
      mimeType = 'text/markdown;charset=utf-8';
      extension = 'md';
      break;
    case 'csv':
      content = toCsv(impulses);
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
      break;
    case 'json':
      content = toJson(impulses);
      mimeType = 'application/json;charset=utf-8';
      extension = 'json';
      break;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `synapse-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
