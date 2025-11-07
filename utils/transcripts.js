export async function getTranscriptsManifest(kind = 'full') {
  const fileName = kind === 'summary' ? 'transcripts-summary.json' : 'transcripts.json';
  if (process.server) {
    try {
      const fs = eval('require')('fs');
      const path = eval('require')('path');
      const filePath = path.join(process.cwd(), 'static', 'data', fileName);
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to read transcripts manifest:', err);
      return null;
    }
  }

  const basePath = process.env.NUXT_PUBLIC_BASE_PATH || '';
  const response = await fetch(`${basePath}/data/${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to load transcripts manifest (${response.status})`);
  }
  return response.json();
}
