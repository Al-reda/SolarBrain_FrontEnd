/**
 * DownloadProposalButton.tsx — shows a download button whenever a design is
 * available. Calls the lazy-loaded PDF generator on click.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../store/useApp';
import { downloadProposalPdf } from '../pdf/generateProposal';

export function DownloadProposalButton() {
  const { t } = useTranslation();
  const { state } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);

  const { systemDesign, selectedPanel, selectedInverter, selectedBattery } = state;
  const ready = !!(systemDesign && selectedPanel && selectedInverter && selectedBattery);

  async function onClick() {
    if (!ready || !systemDesign) return;
    setBusy(true);
    setErr(null);
    try {
      await downloadProposalPdf({
        design:   systemDesign,
        panel:    selectedPanel!,
        inverter: selectedInverter!,
        battery:  selectedBattery!,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pdf-btn-wrap">
      <button
        type="button"
        className="btn btn--green btn--lg"
        disabled={!ready || busy}
        onClick={onClick}
      >
        {busy ? (
          <>
            <Spinner />
            {t('results.downloadingProposal')}
          </>
        ) : (
          <>
            <PdfIcon />
            {t('results.downloadProposal')}
          </>
        )}
      </button>
      {err && <span className="err" style={{ marginInlineStart: 12 }}>⚠ {err}</span>}
    </div>
  );
}

function PdfIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ marginInlineEnd: 8, verticalAlign: '-2px' }}>
      <path d="M4 1h4l3 3v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"
            stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7 7v4M5 9l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
         style={{ marginInlineEnd: 8, verticalAlign: '-2px' }}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
      <path d="M12.5 7a5.5 5.5 0 0 0-5.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7"
                          dur="0.9s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}
