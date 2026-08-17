const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
]);

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeVideoId(value: string | undefined): string | undefined {
  if (!value) return undefined;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  const hostname = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(hostname)) return undefined;

  let candidate = '';
  if (hostname === 'youtu.be') {
    candidate = url.pathname.split('/').filter(Boolean)[0] ?? '';
  } else if (url.pathname === '/watch') {
    candidate = url.searchParams.get('v') ?? '';
  } else {
    const [route, id] = url.pathname.split('/').filter(Boolean);
    if (route === 'embed' || route === 'shorts' || route === 'live') candidate = id ?? '';
  }

  return YOUTUBE_ID_PATTERN.test(candidate) ? candidate : undefined;
}

export function getYouTubePosterUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}
