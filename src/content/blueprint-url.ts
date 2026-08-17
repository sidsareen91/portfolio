export type BlueprintViewerSource = {
  title: string;
  src: string;
  iframeTitle: string;
};

export type BlueprintCta = BlueprintViewerSource & {label: string};

export const DEFAULT_BLUEPRINT_CTA_LABEL = 'VIEW BLUEPRINT';

const blueprintRenderPath = /^\/render\/[a-zA-Z0-9_-]+\/?$/;
const blueprintSharePath = /^\/blueprint\/([a-zA-Z0-9_-]+)\/?$/;

const isApprovedBlueprintHost = (hostname: string) =>
  hostname === 'blueprintue.com' || hostname === 'www.blueprintue.com';

export function normalizeBlueprintUrl(value: unknown): string {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const shareMatch = parsed.pathname.match(blueprintSharePath);
    const canConvert = parsed.protocol === 'https:'
      && isApprovedBlueprintHost(parsed.hostname)
      && !parsed.search
      && !parsed.hash
      && !parsed.username
      && !parsed.password
      && shareMatch;

    return canConvert
      ? `${parsed.origin}/render/${shareMatch[1]}/`
      : trimmed;
  } catch {
    return trimmed;
  }
}

export function isBlueprintRenderUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const parsed = new URL(value.trim());
    const approvedHost = isApprovedBlueprintHost(parsed.hostname);

    return parsed.protocol === 'https:'
      && approvedHost
      && blueprintRenderPath.test(parsed.pathname)
      && !parsed.search
      && !parsed.hash
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

export function getBlueprintViewerSource(
  prototype: {title: string; blueprintUrl?: string} | undefined,
): BlueprintViewerSource | undefined {
  if (!prototype || !isBlueprintRenderUrl(prototype.blueprintUrl)) return undefined;

  const title = prototype.title.trim();
  return {
    title,
    src: prototype.blueprintUrl.trim(),
    iframeTitle: `${title} Blueprint`,
  };
}

export function getBlueprintCta(
  prototype: {
    title: string;
    blueprintUrl?: string;
    blueprintCtaEnabled?: boolean;
    blueprintCtaLabel?: string;
  } | undefined,
): BlueprintCta | undefined {
  if (!prototype || prototype.blueprintCtaEnabled === false) return undefined;

  const source = getBlueprintViewerSource(prototype);
  if (!source) return undefined;

  return {
    ...source,
    label: prototype.blueprintCtaLabel?.trim() || DEFAULT_BLUEPRINT_CTA_LABEL,
  };
}
