import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import test from 'node:test';
import {
  getValidPrototypeTabIndex,
  hasMeaningfulTabContent,
  isPrototypeTagColor,
  PROTOTYPE_TAG_COLORS,
} from './design-lab';
import {
  DESIGN_LAB_HIGHLIGHT_MARK,
  normalizePrototypeTabContent,
  prototypePortableTextPlainText,
} from './prototype-tab-content';
import {site} from './portfolio';

const tab = (key: string, label: string, body?: string, items?: string[]) => ({key, label, body, items});

test('accepts only approved prototype tag color tokens', () => {
  assert.deepEqual(PROTOTYPE_TAG_COLORS, ['yellow', 'mint', 'coral', 'lavender']);
  for (const color of PROTOTYPE_TAG_COLORS) assert.equal(isPrototypeTagColor(color), true);
  assert.equal(isPrototypeTagColor('#efc66a'), false);
  assert.equal(isPrototypeTagColor('blue'), false);
});

test('reads the prototype tag label and color from prototype data', async () => {
  const homepageSource = await readFile(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8');
  assert.equal(site.prototypes[0].tag.label, 'Prototype');
  assert.equal(site.prototypes[0].tag.color, 'yellow');
  assert.match(homepageSource, /\{site\.prototypes\[0\]\.tag\.label\}/);
  assert.match(homepageSource, /data-tag-color=\{site\.prototypes\[0\]\.tag\.color\}/);
  assert.doesNotMatch(homepageSource, /class="lab-eyebrow">Prototype</);
});

test('keeps overflow behavior responsive without changing the folder structure', async () => {
  const css = await readFile(resolve(process.cwd(), 'src/styles/home.css'), 'utf8');
  const tabListRule = css.slice(css.indexOf('.lab-tab-list {'), css.indexOf('.lab-tab-list::-webkit-scrollbar'));
  assert.match(tabListRule, /overflow-x: auto/);
  assert.match(tabListRule, /overscroll-behavior-x: contain/);
  assert.match(tabListRule, /scrollbar-width: none/);
});

test('recognizes paragraph content, list content, or both as meaningful', () => {
  assert.equal(hasMeaningfulTabContent(tab('one', 'One', 'A paragraph')), true);
  assert.equal(hasMeaningfulTabContent(tab('two', 'Two', undefined, ['A finding'])), true);
  assert.equal(hasMeaningfulTabContent(tab('three', 'Three', 'Context', ['A finding'])), true);
  assert.equal(hasMeaningfulTabContent(tab('empty', 'Empty', '  ', [' '])), false);
});

test('preserves selected Design Lab highlights and groups consecutive bullet blocks', () => {
  const portableText = [
    {
      _key: 'paragraph',
      _type: 'block' as const,
      children: [
        {_type: 'span' as const, text: 'Readable '},
        {_type: 'span' as const, text: 'landing target', marks: [DESIGN_LAB_HIGHLIGHT_MARK]},
      ],
    },
    {
      _key: 'finding-1',
      _type: 'block' as const,
      listItem: 'bullet' as const,
      children: [{_type: 'span' as const, text: 'First finding'}],
    },
    {
      _key: 'finding-2',
      _type: 'block' as const,
      listItem: 'bullet' as const,
      children: [{_type: 'span' as const, text: 'Second finding'}],
    },
  ];

  const content = normalizePrototypeTabContent(portableText);
  assert.equal(prototypePortableTextPlainText(portableText), 'Readable landing target\nFirst finding\nSecond finding');
  assert.deepEqual(content, [
    {
      key: 'paragraph',
      type: 'paragraph',
      spans: [
        {text: 'Readable ', highlighted: false},
        {text: 'landing target', highlighted: true},
      ],
    },
    {
      key: 'list-finding-1',
      type: 'list',
      items: [
        {key: 'finding-1', spans: [{text: 'First finding', highlighted: false}]},
        {key: 'finding-2', spans: [{text: 'Second finding', highlighted: false}]},
      ],
    },
  ]);
  assert.equal(hasMeaningfulTabContent({content}), true);
});

test('wires the Design Lab Highlight mark through Studio, GROQ, adapter, and safe frontend rendering', async () => {
  const [schema, query, adapter, homepage, css] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/schemas/documents/prototype.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/cms/query.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/cms/adapter.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/styles/home.css'), 'utf8'),
  ]);

  assert.match(schema, /title: 'Highlight'/);
  assert.match(schema, /value: DESIGN_LAB_HIGHLIGHT_MARK/);
  assert.match(schema, /icon: HeroAccentIcon/);
  assert.match(schema, /component: HeroAccentDecorator/);
  assert.match(schema, /Select the words you want highlighted/);
  assert.match(query, /content\[\]\{_key, _type, listItem, level, children\[\]\{_key, _type, text, marks\}\}/);
  assert.match(adapter, /content: normalizePrototypeTabContent\(tab\.content\)/);
  assert.match(homepage, /<mark class="lab-text-highlight">/);
  assert.match(homepage, /document\.createElement\('mark'\)/);
  assert.doesNotMatch(homepage, /innerHTML\s*=/);
  assert.match(css, /\.lab-text-highlight \{/);
  assert.match(css, /\.lab-text-highlight \{[^}]*background: transparent;/);
  assert.match(css, /\.lab-text-highlight \{[^}]*color: var\(--coral\);/);
  assert.doesNotMatch(css, /\.lab-text-highlight \{[^}]*background: var\(--lab-accent\);/);
});

test('supports one, two, and three-or-more tabs while preserving editorial order', () => {
  const one = [tab('problem', 'Problem', 'Question')];
  const two = [...one, tab('findings', 'Findings', undefined, ['Finding'])];
  const four = [
    tab('constraints', 'Constraints', 'Constraints'),
    tab('problem', 'Problem', 'Question'),
    tab('findings', 'Findings', undefined, ['Finding']),
    tab('iteration', 'Iteration', 'Iteration notes'),
  ];

  assert.equal(getValidPrototypeTabIndex({tabs: one}, 0), 0);
  assert.equal(getValidPrototypeTabIndex({tabs: two}, 1), 1);
  assert.deepEqual(four.map(({key}) => key), ['constraints', 'problem', 'findings', 'iteration']);
  assert.equal(getValidPrototypeTabIndex({tabs: four}, 3), 3);
});

test('prototype switching cannot retain an invalid active tab index', () => {
  const threeTabs = {tabs: [
    tab('one', 'One', 'One'),
    tab('two', 'Two', 'Two'),
    tab('three', 'Three', 'Three'),
  ]};
  const oneTab = {tabs: [tab('only', 'Only', 'Only')]};

  assert.equal(getValidPrototypeTabIndex(threeTabs, 2), 2);
  assert.equal(getValidPrototypeTabIndex(oneTab, 2), 0);
  assert.equal(getValidPrototypeTabIndex(oneTab, -1), 0);
});

test('preserves image, GIF, and video media from Sanity in the Design Lab renderer', async () => {
  const [adapterSource, homepageSource] = await Promise.all([
    readFile(resolve(process.cwd(), 'src/cms/adapter.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8'),
  ]);

  assert.match(adapterSource, /media: mapMedia\(prototype\.primaryMedia, \{[\s\S]*?requireMeaningfulOptIn: true/);
  assert.doesNotMatch(adapterSource, /media: mapMediaPoster\(prototype\.primaryMedia\)/);
  assert.match(homepageSource, /prototype\.media\.kind === 'video'/);
  assert.match(homepageSource, /data-prototype-media/);
  assert.match(homepageSource, /data-native-video-slide/);
  assert.match(homepageSource, /resetNativeVideo\(media\)/);
});
