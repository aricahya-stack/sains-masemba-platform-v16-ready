'use client';
import { useMemo, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import { MathHtml, toSpeechText } from './math-html';

export function ExplanationTools({ html, title = 'Pembahasan' }: { html: string; title?: string }) {
  const [running, setRunning] = useState(false);
  const speechText = useMemo(() => toSpeechText(html), [html]);

  const speak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText || 'Belum ada pembahasan.');
    utterance.lang = 'id-ID';
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="explanation-panel">
      <div className="section-title-row">
        <div>
          <div className="eyebrow">{title}</div>
          <strong>Mode baca pembahasan</strong>
        </div>
        <div className="inline-group">
          <button className="button-secondary" type="button" onClick={() => setRunning((prev) => !prev)}>
            {running ? <Pause size={15} /> : <Play size={15} />}
            {running ? 'Jeda teks' : 'Teks gerak'}
          </button>
          <button className="button-secondary" type="button" onClick={speak}>
            <Volume2 size={15} />
            Suara Indonesia
          </button>
        </div>
      </div>
      <div className={`reading-box${running ? ' is-running' : ''}`}>
        <MathHtml html={html || '<p>Belum ada pembahasan.</p>'} className="reading-content" />
      </div>
    </div>
  );
}
