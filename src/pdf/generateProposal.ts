/**
 * generateProposal.ts — browser-side helper that renders the Proposal PDF
 * and triggers a download. Lazy-loads @react-pdf/renderer so the heavy
 * library stays out of the initial bundle.
 */

import type { SystemDesign, RankedPanel, RankedInverter, RankedBattery } from '../types/api';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

export async function downloadProposalPdf(args: {
  design:   SystemDesign;
  panel:    RankedPanel;
  inverter: RankedInverter;
  battery:  RankedBattery;
  filename?: string;
}): Promise<void> {
  // Lazy imports — both the renderer and our JSX template are only
  // pulled in when the user actually clicks "Download proposal"
  const [{ pdf }, { ProposalDocument }, React] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ProposalDocument'),
    import('react'),
  ]);

  // Cast required: pdf() wants ReactElement<DocumentProps>, but
  // createElement(ProposalDocument, ...) is FunctionComponentElement.
  // ProposalDocument returns a <Document> at runtime so this is safe.
  const doc = React.createElement(ProposalDocument, {
    design:   args.design,
    panel:    args.panel,
    inverter: args.inverter,
    battery:  args.battery,
  }) as unknown as ReactElement<DocumentProps>;

  const blob = await pdf(doc).toBlob();
  const url  = URL.createObjectURL(blob);

  const filename = args.filename ?? defaultFilename(args.design);

  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke after a beat so Safari/FF have time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function defaultFilename(d: SystemDesign): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const slug = `${d.profile.userType}-${d.profile.region}`.toLowerCase();
  return `solarbrain-proposal-${slug}-${date}.pdf`;
}
