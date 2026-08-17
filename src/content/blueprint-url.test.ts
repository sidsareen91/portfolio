import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_BLUEPRINT_CTA_LABEL,
  getBlueprintCta,
  getBlueprintViewerSource,
  isBlueprintRenderUrl,
  normalizeBlueprintUrl,
} from './blueprint-url';

test('converts copied BlueprintUE share links into iframe render links', () => {
  assert.equal(
    normalizeBlueprintUrl('https://blueprintue.com/blueprint/qm1xocn2/'),
    'https://blueprintue.com/render/qm1xocn2/',
  );
  assert.equal(
    normalizeBlueprintUrl(' https://www.blueprintue.com/blueprint/qm1xocn2 '),
    'https://www.blueprintue.com/render/qm1xocn2/',
  );
  assert.equal(
    normalizeBlueprintUrl('https://blueprintue.com/render/qm1xocn2/'),
    'https://blueprintue.com/render/qm1xocn2/',
  );
});

test('does not normalize unsafe or malformed Blueprint URLs', () => {
  assert.equal(
    normalizeBlueprintUrl('http://blueprintue.com/blueprint/qm1xocn2/'),
    'http://blueprintue.com/blueprint/qm1xocn2/',
  );
  assert.equal(
    normalizeBlueprintUrl('https://example.com/blueprint/qm1xocn2/'),
    'https://example.com/blueprint/qm1xocn2/',
  );
  assert.equal(
    normalizeBlueprintUrl('https://blueprintue.com/blueprint/qm1xocn2/?embed=1'),
    'https://blueprintue.com/blueprint/qm1xocn2/?embed=1',
  );
});

test('accepts only HTTPS BlueprintUE render URLs', () => {
  assert.equal(isBlueprintRenderUrl('https://blueprintue.com/render/qm1xocn2/'), true);
  assert.equal(isBlueprintRenderUrl('https://www.blueprintue.com/render/qm1xocn2'), true);
  assert.equal(isBlueprintRenderUrl('http://blueprintue.com/render/qm1xocn2/'), false);
  assert.equal(isBlueprintRenderUrl('https://blueprintue.com/blueprint/qm1xocn2/'), false);
  assert.equal(isBlueprintRenderUrl('https://example.com/render/qm1xocn2/'), false);
  assert.equal(isBlueprintRenderUrl('https://blueprintue.com.evil.example/render/qm1xocn2/'), false);
  assert.equal(isBlueprintRenderUrl('https://blueprintue.com/render/qm1xocn2/?embed=1'), false);
});

test('keeps each prototype Blueprint source isolated', () => {
  const prototypes = [
    {title: 'Prototype One', blueprintUrl: 'https://blueprintue.com/render/test-one/'},
    {title: 'Prototype Two', blueprintUrl: 'https://blueprintue.com/render/test-two/'},
    {title: 'Prototype Three', blueprintUrl: 'https://blueprintue.com/render/test-three/'},
  ];

  const sources = prototypes.map((prototype) => getBlueprintViewerSource(prototype));
  assert.deepEqual(sources.map((source) => source?.src), [
    'https://blueprintue.com/render/test-one/',
    'https://blueprintue.com/render/test-two/',
    'https://blueprintue.com/render/test-three/',
  ]);
  assert.equal(getBlueprintViewerSource({title: 'No Blueprint'}), undefined);
});

test('uses the default Blueprint CTA label and permits a constrained editorial override', () => {
  const base = {title: 'Networked Leap', blueprintUrl: 'https://blueprintue.com/render/networked/'};
  assert.equal(getBlueprintCta(base)?.label, DEFAULT_BLUEPRINT_CTA_LABEL);
  assert.equal(getBlueprintCta({...base, blueprintCtaLabel: 'View Combat Blueprint'})?.label, 'View Combat Blueprint');
});

test('hides Blueprint CTA for explicit disable, missing URL, or invalid URL', () => {
  assert.equal(getBlueprintCta({
    title: 'Disabled',
    blueprintUrl: 'https://blueprintue.com/render/disabled/',
    blueprintCtaEnabled: false,
  }), undefined);
  assert.equal(getBlueprintCta({title: 'Missing'}), undefined);
  assert.equal(getBlueprintCta({title: 'Invalid', blueprintUrl: 'https://example.com/render/nope/'}), undefined);
});

test('keeps one prototype CTA configuration from affecting another prototype', () => {
  const prototypes = [
    {title: 'One', blueprintUrl: 'https://blueprintue.com/render/one/', blueprintCtaLabel: 'View Graph'},
    {title: 'Two', blueprintUrl: 'https://blueprintue.com/render/two/', blueprintCtaEnabled: false},
    {title: 'Three', blueprintUrl: 'https://blueprintue.com/render/three/'},
  ];
  assert.deepEqual(prototypes.map((prototype) => getBlueprintCta(prototype)?.label), [
    'View Graph',
    undefined,
    DEFAULT_BLUEPRINT_CTA_LABEL,
  ]);
});
