import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SOURCES, searchAudio, type AudioResult, type SourceId } from './sources';
import { importFromLink, importOwnFiles, importResult, isFreeSourceLink, projectCredits, ytDlpStatus } from './importRemote';
import './audio-browser.css';

const KEYS_KEY = 'cutline.audioKeys';
const env = import.meta.env as Record<string, string | undefined>;

function loadKeys(): { jamendo?: string; freesound?: string } {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(KEYS_KEY) ?? '{}');
  } catch {
    /* ignore */
  }
  return { jamendo: env.VITE_JAMENDO_CLIENT_ID, freesound: env.VITE_FREESOUND_TOKEN, ...stored };
}

const fmt = (s: number) => (s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '');

/** "Audio" button for the media bin header. Opens the in-app audio browser. */
export function AudioBrowserButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} title="Search royalty-free music and sound effects">🎵 Audio</button>
      {open && createPortal(<AudioBrowser onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

type Tab = SourceId | 'link' | 'mine';

function AudioBrowser({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('openverse');
  const [query, setQuery] = useState('');
  const [commercialOnly, setCommercialOnly] = useState(true);
  const [results, setResults] = useState<AudioResult[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Record<string, 'bin' | 'timeline' | 'done'>>({});
  const [playing, setPlaying] = useState<string | null>(null);
  const [keys, setKeys] = useState(loadKeys);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const ownRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      audio.current?.pause();
    };
  }, [onClose]);

  const source = SOURCES.find((s) => s.id === tab);
  const missingKey = source?.needsKey && !keys[source.needsKey];

  const run = async (p = 1) => {
    if (tab === 'mine' || tab === 'link' || !query.trim()) return;
    const seq = ++searchSeq.current;
    setLoading(true);
    setError('');
    try {
      const rows = await searchAudio(tab, { query: query.trim(), page: p, commercialOnly, keys });
      if (seq !== searchSeq.current) return;
      setResults((prev) => (p === 1 ? rows : [...prev, ...rows]));
      setPage(p);
      if (p === 1 && !rows.length) setError('No results. Try a different word, like "lofi", "rain" or "whoosh".');
    } catch (e) {
      if (seq === searchSeq.current) setError((e as Error).message);
    } finally {
      if (seq === searchSeq.current) setLoading(false);
    }
  };

  // re-run when the source or license filter changes
  useEffect(() => {
    setResults([]);
    void run(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, commercialOnly]);

  const preview = (r: AudioResult) => {
    if (playing === r.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const el = new Audio(r.previewUrl);
    el.onended = () => setPlaying(null);
    el.onerror = () => {
      setPlaying(null);
      setToast("Couldn't play this preview.");
    };
    void el.play().catch(() => {});
    audio.current = el;
    setPlaying(r.id);
  };

  const add = async (r: AudioResult, toTimeline: boolean) => {
    setBusy((b) => ({ ...b, [r.id]: toTimeline ? 'timeline' : 'bin' }));
    try {
      await importResult(r, toTimeline);
      setBusy((b) => ({ ...b, [r.id]: 'done' }));
      setToast(toTimeline ? `Added "${r.title}" at the playhead` : `"${r.title}" is in your media bin`);
    } catch (e) {
      setBusy((b) => {
        const next = { ...b };
        delete next[r.id];
        return next;
      });
      setToast((e as Error).message);
    }
  };

  const copyCredits = async () => {
    const lines = projectCredits();
    if (!lines.length) return setToast('No tracks in this project need credit.');
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setToast(`Copied ${lines.length} credit line(s). Paste them in your video description.`);
    } catch {
      window.prompt('Copy these credits:', lines.join('\n'));
    }
  };

  const saveKeys = (next: typeof keys) => {
    setKeys(next);
    try {
      localStorage.setItem(KEYS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="ab-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ab-panel" role="dialog" aria-label="Audio browser">
        <header className="ab-head">
          <strong>Find audio</strong>
          <span className="spacer" />
          <button onClick={copyCredits} title="Copy credit lines for tracks used in this project">Copy credits</button>
          <button onClick={() => setShowSettings((v) => !v)} title="API keys">⚙</button>
          <button onClick={onClose} title="Close (Esc)">✕</button>
        </header>

        <nav className="ab-tabs">
          {SOURCES.map((s) => (
            <button key={s.id} className={tab === s.id ? 'on' : ''} onClick={() => setTab(s.id)}>{s.label}</button>
          ))}
          <button className={tab === 'link' ? 'on' : ''} onClick={() => setTab('link')}>Paste link</button>
          <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>My files</button>
        </nav>

        {showSettings && (
          <div className="ab-settings">
            <p className="dim">Openverse works without a key. Jamendo and Freesound keys are free and stay in this browser.</p>
            <label>
              Jamendo client ID <a href="https://devportal.jamendo.com/" target="_blank" rel="noreferrer">get one</a>
              <input value={keys.jamendo ?? ''} onChange={(e) => saveKeys({ ...keys, jamendo: e.target.value.trim() })} />
            </label>
            <label>
              Freesound API key <a href="https://freesound.org/apiv2/apply/" target="_blank" rel="noreferrer">get one</a>
              <input value={keys.freesound ?? ''} onChange={(e) => saveKeys({ ...keys, freesound: e.target.value.trim() })} />
            </label>
          </div>
        )}

        {tab === 'link' ? (
          <LinkImport onToast={setToast} />
        ) : tab === 'mine' ? (
          <div
            className="ab-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void importOwnFiles(e.dataTransfer.files, true).then(() => setToast('Added to the timeline'), (err) => setToast(err.message));
            }}
          >
            <p>Drop your own music or voiceover here, or</p>
            <button className="primary" onClick={() => ownRef.current?.click()}>Choose audio files…</button>
            <input
              ref={ownRef}
              type="file"
              accept="audio/*"
              multiple
              hidden
              onChange={(e) => e.target.files && importOwnFiles(e.target.files, true).then(() => setToast('Added to the timeline'), (err) => setToast(err.message))}
            />
            <p className="dim small">Use audio you made or have the rights to. Clips land at the playhead on a free audio track.</p>
          </div>
        ) : (
          <>
            <form
              className="ab-search"
              onSubmit={(e) => {
                e.preventDefault();
                void run(1);
              }}
            >
              <input autoFocus placeholder="Search music or sound effects, e.g. upbeat, cinematic, whoosh" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="primary" disabled={loading || !query.trim()}>Search</button>
            </form>
            <div className="ab-filters">
              <label>
                <input type="checkbox" checked={commercialOnly} onChange={(e) => setCommercialOnly(e.target.checked)} /> OK for monetized videos
              </label>
              <span className="dim small">{source?.note}</span>
            </div>
            {missingKey && (
              <div className="warn">
                {source?.label} needs a free key. <button className="link" onClick={() => setShowSettings(true)}>Add key</button>
              </div>
            )}
            {error && <div className="ab-msg">{error}</div>}
            <ul className="ab-results">
              {results.map((r) => {
                const state = busy[r.id];
                return (
                  <li key={r.id}>
                    <button className="ab-play" onClick={() => preview(r)} title="Preview">{playing === r.id ? '❚❚' : '▶'}</button>
                    <div className="ab-meta">
                      <div className="ab-title" title={r.title}>{r.title}</div>
                      <div className="dim small">
                        {r.creator} · {fmt(r.duration)}{' '}
                        <a href={r.licenseUrl || r.pageUrl} target="_blank" rel="noreferrer" className={`ab-lic ${r.commercialOk ? '' : 'nc'}`}>{r.license}</a>
                        {r.needsCredit && <span className="dim"> · credit needed</span>}
                      </div>
                    </div>
                    {state === 'done' ? (
                      <span className="ab-done">✓ Added</span>
                    ) : (
                      <div className="ab-actions">
                        <button disabled={!!state} onClick={() => add(r, false)} title="Add to the media bin">{state === 'bin' ? '…' : '+ Bin'}</button>
                        <button className="primary" disabled={!!state} onClick={() => add(r, true)} title="Add at the playhead on the timeline">
                          {state === 'timeline' ? 'Adding…' : '+ Timeline'}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {loading && <div className="ab-msg dim">Searching…</div>}
            {!loading && results.length > 0 && results.length % 20 === 0 && (
              <button className="ab-more" onClick={() => run(page + 1)}>Load more</button>
            )}
            {!results.length && !loading && !error && (
              <div className="ab-msg dim">Search royalty-free music and sound effects. Results drop straight onto your timeline.</div>
            )}
          </>
        )}
        {tab !== 'link' && tab !== 'mine' && (
          <footer className="ab-foot dim small">
            Only openly licensed audio is shown. Tracks marked "credit needed" must be credited; use Copy credits when you publish.
          </footer>
        )}
        {toast && <div className="ab-toast">{toast}</div>}
      </div>
    </div>
  );
}

const ACK_KEY = 'cutline.linkWarningAck';

/** Paste a link: direct audio files, free libraries, or any site yt-dlp supports (audio only). */
function LinkImport({ onToast }: { onToast: (msg: string) => void }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Awaited<ReturnType<typeof ytDlpStatus>> | null>(null);
  const [busy, setBusy] = useState<'bin' | 'timeline' | null>(null);
  const [ack, setAck] = useState(() => {
    try {
      return localStorage.getItem(ACK_KEY) === '1';
    } catch {
      return false;
    }
  });

  const check = () => {
    setStatus(null);
    void ytDlpStatus().then(setStatus);
  };
  useEffect(() => {
    void ytDlpStatus().then(setStatus);
  }, []);

  let valid = false;
  try {
    valid = /^https?:$/.test(new URL(url.trim()).protocol);
  } catch {
    /* not a url yet */
  }
  const free = valid && isFreeSourceLink(url.trim());
  const needsAck = valid && !free && !ack;

  const go = async (toTimeline: boolean) => {
    setBusy(toTimeline ? 'timeline' : 'bin');
    try {
      const name = await importFromLink(url.trim(), toTimeline);
      onToast(toTimeline ? `Added "${name}" at the playhead` : `"${name}" is in your media bin`);
      setUrl('');
    } catch (e) {
      onToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const setAckSaved = (v: boolean) => {
    setAck(v);
    try {
      localStorage.setItem(ACK_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="ab-link">
      <form
        className="ab-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !needsAck && !busy) void go(true);
        }}
      >
        <input autoFocus placeholder="Paste a link: YouTube, TikTok, Freesound, Internet Archive, or an .mp3 file" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" disabled={!valid || needsAck || !!busy} onClick={() => go(false)}>{busy === 'bin' ? '…' : '+ Bin'}</button>
        <button className="primary" disabled={!valid || needsAck || !!busy}>{busy === 'timeline' ? 'Getting audio…' : '+ Timeline'}</button>
      </form>

      {valid && !free && (
        <div className="ab-copyright">
          <strong>⚠ This audio is probably copyrighted.</strong>
          <p>
            Music from YouTube, TikTok and similar sites usually belongs to someone else, and downloading it can break those sites' terms. Keep it for
            personal, offline projects. Videos you post with it can be muted, demonetized or taken down.
          </p>
          <label>
            <input type="checkbox" checked={ack} onChange={(e) => setAckSaved(e.target.checked)} /> I understand, this is for my personal use
          </label>
        </div>
      )}
      {free && <p className="ab-ok small">✓ Openly licensed source. Check the page for the license and credit the creator if it asks.</p>}

      <div className="ab-ytdlp small">
        {status === null ? (
          <span className="dim">Checking for yt-dlp…</span>
        ) : !status.devServer ? (
          <span>Link import needs the CoreCut app (or <code>npm run dev</code>). Direct links to audio files may still work.</span>
        ) : status.installed ? (
          <span className="dim">Using yt-dlp {status.version} on this computer. Audio only, no conversion, so it's quick.</span>
        ) : (
          <span>
            To import from YouTube, TikTok and other pages, install <strong>yt-dlp</strong> once.{' '}
            {navigator.userAgent.includes('Windows') ? (
              <>
                Open a terminal and run <code>winget install yt-dlp.yt-dlp</code>. No winget? Download <code>yt-dlp.exe</code> from{' '}
                <a href="https://github.com/yt-dlp/yt-dlp/releases/latest" target="_blank" rel="noreferrer">its releases page</a> and put it in a{' '}
                <code>tools</code> folder next to CoreCut.exe.
              </>
            ) : (
              <>
                Run <code>pip install -U yt-dlp</code> or <code>brew install yt-dlp</code>.
              </>
            )}{' '}
            Then <button className="link" onClick={check}>check again</button>. Direct links to audio files work without it.
          </span>
        )}
      </div>
    </div>
  );
}
