export const DESIGN_LAB_HIGHLIGHT_MARK = 'designLabHighlight';

export type PrototypePortableTextSpan = {
  _key?: string;
  _type?: 'span';
  text?: string;
  marks?: string[];
};

export type PrototypePortableTextBlock = {
  _key?: string;
  _type?: 'block';
  listItem?: 'bullet';
  level?: number;
  children?: PrototypePortableTextSpan[];
};

export type PrototypeTabTextRun = {
  text: string;
  highlighted: boolean;
};

export type PrototypeTabContentNode =
  | {key: string; type: 'paragraph'; spans: PrototypeTabTextRun[]}
  | {key: string; type: 'list'; items: Array<{key: string; spans: PrototypeTabTextRun[]}>};

export function prototypePortableTextPlainText(
  blocks: PrototypePortableTextBlock[] | undefined,
): string {
  return (blocks ?? [])
    .map((block) => (block.children ?? []).map((span) => span.text ?? '').join(''))
    .join('\n')
    .trim();
}

function normalizeSpans(block: PrototypePortableTextBlock): PrototypeTabTextRun[] {
  return (block.children ?? [])
    .map((span) => ({
      text: span.text ?? '',
      highlighted: span.marks?.includes(DESIGN_LAB_HIGHLIGHT_MARK) ?? false,
    }))
    .filter(({text}) => text.length > 0);
}

export function normalizePrototypeTabContent(
  blocks: PrototypePortableTextBlock[] | undefined,
): PrototypeTabContentNode[] {
  const content: PrototypeTabContentNode[] = [];

  for (const [index, block] of (blocks ?? []).entries()) {
    if (block._type !== 'block') continue;
    const spans = normalizeSpans(block);
    if (!spans.some(({text}) => text.trim())) continue;
    const key = block._key?.trim() || `block-${index + 1}`;

    if (block.listItem === 'bullet') {
      const previous = content.at(-1);
      if (previous?.type === 'list') {
        previous.items.push({key, spans});
      } else {
        content.push({key: `list-${key}`, type: 'list', items: [{key, spans}]});
      }
      continue;
    }

    content.push({key, type: 'paragraph', spans});
  }

  return content;
}
