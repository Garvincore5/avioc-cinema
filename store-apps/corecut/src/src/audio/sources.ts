// Legal, royalty-free audio sources with public search APIs.
// Openverse works with no key. Jamendo and Freesound need a free key (see AudioBrowser settings).

export type SourceId = 'openverse' | 'jamendo' | 'freesound';

export interface AudioResult {
  id: string;
  source: SourceId;
  title: string;
  creator: string;
  duration: number; // seconds, 0 if unknown
  previewUrl: string; // streamable for preview
  downloadUrl: string; // file to import
  license: string; // short label, e.g. "CC BY 4.0"
  licenseUrl: string;
  pageUrl: string; // where the track lives, for credit
  commercialOk: boolean;
  needsCredit: boolean;
}

export interface SearchOptions {
  query: string;
  page: number;
  commercialOnly: boolean;
  keys: { jamendo?: string; freesound?: string };
}

export interface SourceInfo {
  id: SourceId;
  label: string;
  needsKey: false | 'jamendo' | 'freesound';
  keyHelp?: string;
  note: string;
}

export const SOURCES: SourceInfo[] = [
  { id: 'openverse', label: 'Openverse', needsKey: false, note: 'Openly licensed music and sound effects from Freesound, Jamendo, Wikimedia and more. No account needed.' },
  { id: 'jamendo', label: 'Jamendo Music', needsKey: 'jamendo', keyHelp: 'https://devportal.jamendo.com/', note: 'Full Creative Commons songs from independent artists.' },
  { id: 'freesound', label: 'Freesound', needsKey: 'freesound', keyHelp: 'https://freesound.org/apiv2/apply/', note: 'Sound effects and ambience. Imports the high-quality MP3 preview.' },
];

const PAGE_SIZE = 20;

/** Turn a CC license code into a label and the two flags we care about. */
function ccInfo(code: string, version = '') {
  const c = code.toLowerCase().replace(/^cc[-_ ]?/, '').replace(/_/g, '-');
  if (c === '0' || c === 'cc0' || c.includes('zero')) return { label: 'CC0', commercialOk: true, needsCredit: false };
  if (c === 'pdm' || c.includes('public')) return { label: 'Public domain', commercialOk: true, needsCredit: false };
  return {
    label: `CC ${c.toUpperCase()}${version ? ` ${version}` : ''}`.trim(),
    commercialOk: !c.includes('nc'),
    needsCredit: true,
  };
}

async function getJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Search failed (${r.status})`);
  return r.json();
}

async function searchOpenverse(o: SearchOptions): Promise<AudioResult[]> {
  const u = new URL('https://api.openverse.org/v1/audio/');
  u.searchParams.set('q', o.query);
  u.searchParams.set('page', String(o.page));
  u.searchParams.set('page_size', String(PAGE_SIZE));
  if (o.commercialOnly) u.searchParams.set('license_type', 'commercial');
  const data = await getJson(u.toString());
  type Row = { id: string; title?: string; creator?: string; duration?: number; url: string; license: string; license_version?: string; license_url?: string; foreign_landing_url?: string };
  return (data.results as Row[]).map((r) => {
    const lic = ccInfo(r.license, r.license_version);
    return {
      id: `ov-${r.id}`,
      source: 'openverse',
      title: r.title || 'Untitled',
      creator: r.creator || 'Unknown',
      duration: (r.duration ?? 0) / 1000,
      previewUrl: r.url,
      downloadUrl: r.url,
      license: lic.label,
      licenseUrl: r.license_url ?? '',
      pageUrl: r.foreign_landing_url ?? '',
      commercialOk: lic.commercialOk,
      needsCredit: lic.needsCredit,
    } satisfies AudioResult;
  });
}

async function searchJamendo(o: SearchOptions): Promise<AudioResult[]> {
  if (!o.keys.jamendo) throw new Error('Add a free Jamendo client ID in settings to search Jamendo.');
  const u = new URL('https://api.jamendo.com/v3.0/tracks/');
  u.searchParams.set('client_id', o.keys.jamendo);
  u.searchParams.set('format', 'json');
  u.searchParams.set('limit', String(PAGE_SIZE));
  u.searchParams.set('offset', String((o.page - 1) * PAGE_SIZE));
  u.searchParams.set('search', o.query);
  u.searchParams.set('audioformat', 'mp32');
  u.searchParams.set('include', 'licenses');
  const data = await getJson(u.toString());
  if (data.headers?.status === 'failed') throw new Error(data.headers.error_message || 'Jamendo search failed');
  type Row = { id: string; name: string; artist_name: string; duration: number; audio: string; audiodownload: string; audiodownload_allowed: boolean; license_ccurl: string; shareurl: string };
  return (data.results as Row[])
    .filter((r) => r.audiodownload_allowed !== false)
    .map((r) => {
      // license_ccurl looks like https://creativecommons.org/licenses/by-nc-sa/3.0/
      const m = r.license_ccurl.match(/licenses\/([a-z-]+)\/([\d.]+)/);
      const lic = ccInfo(m?.[1] ?? 'by', m?.[2]);
      return {
        id: `ja-${r.id}`,
        source: 'jamendo',
        title: r.name,
        creator: r.artist_name,
        duration: r.duration,
        previewUrl: r.audio,
        downloadUrl: r.audiodownload || r.audio,
        license: lic.label,
        licenseUrl: r.license_ccurl,
        pageUrl: r.shareurl,
        commercialOk: lic.commercialOk,
        needsCredit: lic.needsCredit,
      } satisfies AudioResult;
    })
    .filter((r) => !o.commercialOnly || r.commercialOk);
}

async function searchFreesound(o: SearchOptions): Promise<AudioResult[]> {
  if (!o.keys.freesound) throw new Error('Add a free Freesound API key in settings to search Freesound.');
  const u = new URL('https://freesound.org/apiv2/search/text/');
  u.searchParams.set('query', o.query);
  u.searchParams.set('token', o.keys.freesound);
  u.searchParams.set('page', String(o.page));
  u.searchParams.set('page_size', String(PAGE_SIZE));
  u.searchParams.set('fields', 'id,name,username,duration,license,previews,url');
  if (o.commercialOnly) u.searchParams.set('filter', 'license:("Attribution" OR "Creative Commons 0")');
  const data = await getJson(u.toString());
  type Row = { id: number; name: string; username: string; duration: number; license: string; url: string; previews: Record<string, string> };
  return (data.results as Row[]).map((r) => {
    // Freesound gives license deed URLs, e.g. http://creativecommons.org/publicdomain/zero/1.0/
    const m = r.license.match(/licenses\/([a-z+-]+)\/([\d.]+)/);
    const lic = r.license.includes('zero') ? ccInfo('cc0') : r.license.includes('sampling') ? { label: 'Sampling+', commercialOk: false, needsCredit: true } : ccInfo(m?.[1] ?? 'by', m?.[2]);
    const mp3 = r.previews['preview-hq-mp3'] ?? r.previews['preview-lq-mp3'];
    return {
      id: `fs-${r.id}`,
      source: 'freesound',
      title: r.name,
      creator: r.username,
      duration: r.duration,
      previewUrl: mp3,
      downloadUrl: mp3,
      license: lic.label,
      licenseUrl: r.license,
      pageUrl: r.url,
      commercialOk: lic.commercialOk,
      needsCredit: lic.needsCredit,
    } satisfies AudioResult;
  });
}

export function searchAudio(source: SourceId, o: SearchOptions) {
  if (source === 'jamendo') return searchJamendo(o);
  if (source === 'freesound') return searchFreesound(o);
  return searchOpenverse(o);
}

/** One line of credit text for a track, in the TASL style (title, author, source, license). */
export const creditLine = (r: Pick<AudioResult, 'title' | 'creator' | 'pageUrl' | 'license' | 'licenseUrl'>) =>
  `"${r.title}" by ${r.creator}${r.pageUrl ? ` (${r.pageUrl})` : ''}, ${r.license}${r.licenseUrl ? ` (${r.licenseUrl})` : ''}`;
