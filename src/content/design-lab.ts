import type {Prototype, PrototypeFolderTab, PrototypeTagColor} from './portfolio';

export const PROTOTYPE_TAG_COLORS = ['yellow', 'mint', 'coral', 'lavender'] as const;

export function isPrototypeTagColor(value: unknown): value is PrototypeTagColor {
  return typeof value === 'string'
    && (PROTOTYPE_TAG_COLORS as readonly string[]).includes(value);
}

export function hasMeaningfulTabContent(
  tab: Pick<PrototypeFolderTab, 'content' | 'body' | 'items'>,
): boolean {
  const richText = tab.content?.some((block) => block.type === 'paragraph'
    ? block.spans.some(({text}) => text.trim())
    : block.items.some((item) => item.spans.some(({text}) => text.trim())));
  return Boolean(richText || tab.body?.trim() || tab.items?.some((item) => item.trim()));
}

export function getValidPrototypeTabIndex(
  prototype: Pick<Prototype, 'tabs'>,
  requestedIndex: number,
): number {
  return Number.isInteger(requestedIndex)
    && requestedIndex >= 0
    && requestedIndex < prototype.tabs.length
    ? requestedIndex
    : 0;
}
