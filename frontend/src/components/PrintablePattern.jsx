import React from 'react';

/**
 * Print-only pattern document. Hidden on screen; becomes the whole page when
 * printing (the interactive app chrome is print:hidden). Deliberately plain,
 * ink-friendly typography — this is the "PDF export": print → Save as PDF.
 */
export default function PrintablePattern({ pattern, steps = [] }) {
  if (!pattern) return null;
  const meta = [
    ['Difficulty', pattern.difficulty],
    ['Category', pattern.category],
    ['Hook', pattern.hookSize],
    ['Yarn', pattern.yarnWeight],
    ['Time', pattern.timeEstimate],
    ['Finished size', pattern.finishedSize],
  ].filter(([, v]) => v);

  return (
    <div className="hidden print:block bg-white text-black">
      <h1 style={{ fontSize: '22pt', fontWeight: 700, marginBottom: '2pt' }}>{pattern.title}</h1>
      <p style={{ fontSize: '9pt', color: '#555', marginBottom: '12pt' }}>
        {pattern.verified && !pattern.isExperimental ? 'Verified math ✓ — stitch counts computed and independently re-checked. ' : ''}
        Made with Loopsy · loopsy.app
      </p>

      {meta.length > 0 && (
        <table style={{ fontSize: '10pt', marginBottom: '12pt', borderCollapse: 'collapse' }}>
          <tbody>
            {meta.map(([k, v]) => (
              <tr key={k}>
                <td style={{ paddingRight: '14pt', paddingBottom: '2pt', color: '#555' }}>{k}</td>
                <td style={{ paddingBottom: '2pt', fontWeight: 600 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {Array.isArray(pattern.materials) && pattern.materials.length > 0 && (
        <>
          <h2 style={{ fontSize: '13pt', fontWeight: 700, marginBottom: '4pt' }}>Materials</h2>
          <ul style={{ fontSize: '10pt', marginBottom: '12pt', paddingLeft: '14pt' }}>
            {pattern.materials.map((m, i) => <li key={i} style={{ marginBottom: '1pt' }}>{m}</li>)}
          </ul>
        </>
      )}

      {Array.isArray(pattern.notes) && pattern.notes.length > 0 && (
        <>
          <h2 style={{ fontSize: '13pt', fontWeight: 700, marginBottom: '4pt' }}>Notes</h2>
          <ul style={{ fontSize: '10pt', marginBottom: '12pt', paddingLeft: '14pt' }}>
            {pattern.notes.map((n, i) => <li key={i} style={{ marginBottom: '1pt' }}>{n}</li>)}
          </ul>
        </>
      )}

      <h2 style={{ fontSize: '13pt', fontWeight: 700, marginBottom: '6pt' }}>Pattern</h2>
      <ol style={{ fontSize: '10.5pt', paddingLeft: '18pt', lineHeight: 1.45 }}>
        {steps.map((step, i) => {
          const text = step.instruction || step.text || (typeof step === 'string' ? step : '');
          return <li key={i} style={{ marginBottom: '5pt', breakInside: 'avoid' }}>{text}</li>;
        })}
      </ol>
    </div>
  );
}
