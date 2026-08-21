import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'
import {adaptCmsPayload, resolveProjectPrimaryMedia} from '../cms/adapter'
import type {RawCmsPayload, RawMedia} from '../cms/types'
import {validateHomePagePayload, validateMedia} from '../cms/validation'
import {
  inheritAccessibilityForSameImage,
  resolveMediaDecorative,
  resolvePortraitAlt,
} from './media-accessibility'
import {localHomePagePayload} from './portfolio'
import {
  isCurrentProjectPrimaryReuse,
  isDefaultDecorativePlacement,
  isPrototypePrimaryMedia,
  mediaAltWarning,
  prepareMediaPreview,
  shouldHideMediaAlt,
  validateMediaIntegrity,
} from '../../studio/schemas/objects/media'

const imageMedia = (ref: string, overrides: Partial<RawMedia> = {}): RawMedia => ({
  kind: 'image',
  image: {asset: {_ref: ref}},
  imageAsset: {url: `https://cdn.sanity.test/${ref}.gif`, mimeType: 'image/gif'},
  ...overrides,
})

test('Studio media rows show original asset filenames before generic labels', () => {
  assert.deepEqual(
    prepareMediaPreview({
      image: 'image-preview',
      imageFilename: 'KitchenStory4.webp',
      kind: 'image',
    }),
    {
      title: 'Image',
      subtitle: 'KitchenStory4.webp',
      media: 'image-preview',
    },
  )
  assert.equal(
    prepareMediaPreview({kind: 'video', videoFilename: 'prototype-loop.webm'}).subtitle,
    'prototype-loop.webm',
  )
  assert.equal(
    prepareMediaPreview({
      kind: 'video',
      posterFilename: 'poster.webp',
      videoUrl: 'https://cdn.example.com/prototype-loop.mp4',
    } as Parameters<typeof prepareMediaPreview>[0]).subtitle,
    'https://cdn.example.com/prototype-loop.mp4',
  )
  assert.equal(
    prepareMediaPreview({kind: 'video', posterFilename: 'poster.webp'} as Parameters<typeof prepareMediaPreview>[0]).subtitle,
    'Video source unavailable',
  )
  assert.equal(prepareMediaPreview({kind: 'image'}).subtitle, 'Filename unavailable')
})

test('normal media accessibility is a Studio warning while explicit decisions validate', () => {
  const normalContext = {document: {_type: 'other'}, parent: {}}
  assert.equal(
    mediaAltWarning(undefined, normalContext),
    'Add alternative text or mark this media decorative before production.',
  )
  assert.equal(mediaAltWarning(undefined, {...normalContext, parent: {decorative: true}}), true)
  assert.equal(mediaAltWarning('Meaningful visual detail', normalContext), true)
  assert.equal(mediaAltWarning(undefined, {...normalContext, parent: {caption: 'Not alt text'}}),
    'Add alternative text or mark this media decorative before production.')
})

test('Design Lab media defaults supporting and requires an explicit meaningful opt-in', () => {
  const supportingContext = {
    document: {_type: 'prototype'},
    parent: {},
    path: ['primaryMedia', 'alt'],
  }
  const meaningfulContext = {...supportingContext, parent: {decorative: false}}

  assert.equal(isPrototypePrimaryMedia(supportingContext), true)
  assert.equal(isDefaultDecorativePlacement(supportingContext), true)
  assert.equal(shouldHideMediaAlt(supportingContext), true)
  assert.equal(mediaAltWarning(undefined, supportingContext), true)

  assert.equal(shouldHideMediaAlt(meaningfulContext), false)
  assert.equal(
    mediaAltWarning(undefined, meaningfulContext),
    'Add alternative text or turn off “Media adds information beyond the text” before production.',
  )
  assert.equal(mediaAltWarning('Unique spatial relationship', meaningfulContext), true)
})

test('fixed portfolio placements default decorative but a manual alt remains an override', () => {
  const heroContext = {document: {_type: 'homePage'}, parent: {}, path: ['hero', 'media', {_key: 'one'}, 'alt']}
  const galleryContext = {
    document: {_type: 'project', projectType: 'current'},
    parent: {},
    path: ['galleryMedia', {_key: 'one'}, 'alt'],
  }
  const shippedContext = {
    document: {_type: 'project', projectType: 'shipped'},
    parent: {},
    path: ['primaryMedia', 'alt'],
  }
  assert.equal(isDefaultDecorativePlacement(heroContext), true)
  assert.equal(isDefaultDecorativePlacement(galleryContext), true)
  assert.equal(isDefaultDecorativePlacement(shippedContext), true)
  assert.equal(mediaAltWarning(undefined, heroContext), true)
  assert.equal(mediaAltWarning(undefined, galleryContext), true)
  assert.equal(mediaAltWarning(undefined, shippedContext), true)
  assert.equal(shouldHideMediaAlt(heroContext), true)
  assert.equal(shouldHideMediaAlt(galleryContext), true)
  assert.equal(shouldHideMediaAlt(shippedContext), true)
  assert.equal(shouldHideMediaAlt({...galleryContext, parent: {decorative: false}}), false)
  assert.equal(resolveMediaDecorative({}, true), true)
  assert.equal(resolveMediaDecorative({alt: 'Unique visual information'}, true), false)
  assert.equal(resolveMediaDecorative({decorative: false}, true), false)
})

test('portrait alt uses only the canonical name and permits a manual override', () => {
  assert.equal(resolvePortraitAlt('Siddharth Sareen', undefined), 'Portrait of Siddharth Sareen')
  assert.equal(resolvePortraitAlt(' Siddharth Sareen ', ' Custom portrait label '), 'Custom portrait label')
  assert.equal(resolvePortraitAlt(undefined, undefined), '')

  const derived = adaptCmsPayload({settings: {name: 'Siddharth Sareen', portrait: {}}})
  const overridden = adaptCmsPayload({
    settings: {name: 'Siddharth Sareen', portrait: {alt: 'Custom portrait label'}},
  })
  assert.equal(derived.site.profile.portrait.alt, 'Portrait of Siddharth Sareen')
  assert.equal(overridden.site.profile.portrait.alt, 'Custom portrait label')
})

test('Belly Brawl primary fallback inherits gallery item 1 accessibility only for the same asset', () => {
  const primary = imageMedia('belly-one', {alt: 'Independent primary alt', decorative: true})
  const gallery = imageMedia('belly-one', {alt: 'Gallery item alt', decorative: false})
  const inherited = inheritAccessibilityForSameImage(primary, gallery)
  assert.equal(inherited?.alt, 'Gallery item alt')
  assert.equal(inherited?.decorative, false)
  assert.deepEqual(resolveProjectPrimaryMedia({primaryMedia: primary, galleryMedia: [gallery]}), inherited)
  assert.equal(isCurrentProjectPrimaryReuse({
    document: {_type: 'project', projectType: 'current', primaryMedia: primary, galleryMedia: [gallery]},
    path: ['primaryMedia', 'alt'],
  }), true)

  const independent = imageMedia('hero-version', {alt: 'Hero-specific alt'})
  assert.deepEqual(inheritAccessibilityForSameImage(independent, gallery), independent)
})

test('adapter applies fixed decorative defaults without merging different placement contexts', () => {
  const sharedHeroProjectAsset = imageMedia('shared')
  const meaningfulGallery = imageMedia('shared', {alt: 'Unique project evidence'})
  const raw: RawCmsPayload = {
    settings: {name: 'Siddharth Sareen', portrait: {}},
    page: {
      hero: {media: [sharedHeroProjectAsset]},
      featuredProject: {
        primaryMedia: sharedHeroProjectAsset,
        galleryMedia: [meaningfulGallery],
      },
      shippedWork: {projects: [{primaryMedia: imageMedia('cover')}]},
      prototypes: [
        {primaryMedia: imageMedia('prototype-supporting')},
        {
          primaryMedia: imageMedia('prototype-meaningful', {
            alt: 'Meaningful prototype evidence',
            decorative: false,
          }),
        },
      ],
    },
  }

  const {site} = adaptCmsPayload(raw)
  assert.equal(site.hero.media[0].decorative, true)
  assert.equal(site.hero.media[0].alt, '')
  assert.equal(site.bellyBrawl.media[0].decorative, false)
  assert.equal(site.bellyBrawl.media[0].alt, 'Unique project evidence')
  assert.equal(site.shippedWork[0].media.decorative, true)
  assert.equal(site.shippedWork[0].media.alt, '')
  assert.equal(site.prototypes[0].media.decorative, true)
  assert.equal(site.prototypes[0].media.alt, '')
  assert.equal(site.prototypes[1].media.decorative, false)
  assert.equal(site.prototypes[1].media.alt, 'Meaningful prototype evidence')
  assert.equal(site.hero.media[0].fit, 'cover')
})

test('each Design Lab prototype preserves its own accessibility choice', () => {
  const {site} = adaptCmsPayload({
    page: {
      prototypes: [
        {title: 'Supporting', primaryMedia: imageMedia('supporting')},
        {
          title: 'Meaningful',
          primaryMedia: imageMedia('meaningful', {
            decorative: false,
            alt: 'A spatial relationship not explained in the tabs',
          }),
        },
      ],
    },
  })

  assert.deepEqual(
    site.prototypes.map(({media}) => ({alt: media.alt, decorative: media.decorative})),
    [
      {alt: '', decorative: true},
      {alt: 'A spatial relationship not explained in the tabs', decorative: false},
    ],
  )
})

test('Design Lab GIF and video sources retain their existing media behavior', () => {
  const {site} = adaptCmsPayload({
    page: {
      prototypes: [
        {title: 'GIF', primaryMedia: imageMedia('prototype-gif')},
        {
          title: 'Video',
          primaryMedia: {
            kind: 'video',
            videoFile: {asset: {url: 'https://cdn.sanity.test/prototype.mp4'}},
            poster: {asset: {_ref: 'image-poster-1600x900-png'}},
          },
        },
      ],
    },
  })

  assert.equal(site.prototypes[0].media.kind, 'image')
  assert.equal(site.prototypes[0].media.src, 'https://cdn.sanity.test/prototype-gif.gif')
  assert.equal(site.prototypes[0].media.decorative, true)
  assert.equal(site.prototypes[1].media.kind, 'video')
  assert.equal(site.prototypes[1].media.src, 'https://cdn.sanity.test/prototype.mp4')
  assert.equal(site.prototypes[1].media.decorative, true)
})

test('production validation remains hard for meaningful media and ignores captions', () => {
  const errors: string[] = []
  validateMedia({src: '/meaningful.png', alt: '', decorative: false, fit: 'cover'}, 'media', errors)
  assert.deepEqual(errors, ['media.alt is required unless decorative'])

  const captionOnlyErrors: string[] = []
  validateMedia(
    {src: '/meaningful.png', alt: '', decorative: false, fit: 'cover', caption: 'Not alternative text'} as never,
    'media',
    captionOnlyErrors,
  )
  assert.deepEqual(captionOnlyErrors, ['media.alt is required unless decorative'])

  const decorativeErrors: string[] = []
  validateMedia({src: '/supporting.png', alt: '', decorative: true, fit: 'cover'}, 'media', decorativeErrors)
  assert.deepEqual(decorativeErrors, [])

  const payload = structuredClone(localHomePagePayload)
  payload.site.prototypes[0].media.alt = ''
  payload.site.prototypes[0].media.decorative = false
  assert.throws(() => validateHomePagePayload(payload), /alt is required unless decorative/)

  const supportingPrototype = adaptCmsPayload({
    page: {prototypes: [{primaryMedia: imageMedia('supporting-prototype')}]},
  })
  const supportingErrors: string[] = []
  validateMedia(supportingPrototype.site.prototypes[0].media, 'prototype.media', supportingErrors)
  assert.deepEqual(supportingErrors, [])

  const missingMeaningfulAlt = adaptCmsPayload({
    page: {
      prototypes: [{primaryMedia: imageMedia('meaningful-prototype', {decorative: false})}],
    },
  })
  const missingMeaningfulErrors: string[] = []
  validateMedia(
    missingMeaningfulAlt.site.prototypes[0].media,
    'prototype.media',
    missingMeaningfulErrors,
  )
  assert.deepEqual(missingMeaningfulErrors, ['prototype.media.alt is required unless decorative'])

  const completeMeaningfulAlt = adaptCmsPayload({
    page: {
      prototypes: [{primaryMedia: imageMedia('meaningful-prototype', {
        decorative: false,
        alt: 'Unique technical evidence',
      })}],
    },
  })
  const completeMeaningfulErrors: string[] = []
  validateMedia(
    completeMeaningfulAlt.site.prototypes[0].media,
    'prototype.media',
    completeMeaningfulErrors,
  )
  assert.deepEqual(completeMeaningfulErrors, [])
})

test('video source and poster integrity stays hard', () => {
  assert.equal(validateMediaIntegrity({kind: 'image'}), 'Choose an image.')
  assert.equal(validateMediaIntegrity({kind: 'video'}), 'Video requires an image poster.')
  assert.equal(
    validateMediaIntegrity({kind: 'video', poster: {asset: {_ref: 'poster'}}}),
    'Video requires either a file or an HTTPS URL.',
  )
  assert.equal(validateMediaIntegrity({kind: 'video', poster: {}, videoFile: {}}), true)
})

test('Site Settings is the sole SEO source', async () => {
  const payload = adaptCmsPayload({
    settings: {
      defaultSeo: {title: 'Global title', description: 'Global description'},
      siteUrl: 'https://portfolio.example',
    },
  }).seo
  assert.equal(payload.title, 'Global title')
  assert.equal(payload.description, 'Global description')
  assert.equal(payload.canonicalUrl, 'https://portfolio.example')

  const disabledSocialImage = adaptCmsPayload({
    settings: {
      defaultSeo: {
        title: 'Global title',
        description: 'Global description',
        useSocialImage: false,
        socialImage: {image: {asset: {_ref: 'image-social-preview-1200x630-jpg'}}},
      },
    },
  }).seo
  assert.equal(disabledSocialImage.socialImage, undefined)

  const enabledSocialImage = adaptCmsPayload({
    settings: {
      defaultSeo: {
        title: 'Global title',
        description: 'Global description',
        useSocialImage: true,
        socialImage: {image: {asset: {_ref: 'image-social-preview-1200x630-jpg'}}},
      },
    },
  }).seo
  assert.ok(enabledSocialImage.socialImage)

  const [homePageSchema, seoSchema, querySource] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/schemas/documents/homePage.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/schemas/objects/seo.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/cms/query.ts'), 'utf8'),
  ])
  assert.doesNotMatch(homePageSchema, /Homepage SEO override|name: 'seo'/)
  assert.match(seoSchema, /Rule\.required\(\)/)
  assert.match(seoSchema, /name: 'useSocialImage'/)
  assert.match(seoSchema, /hidden: \(\{parent\}\) => parent\?\.useSocialImage !== true/)
  assert.match(seoSchema, /Upload a social image or turn off Use social image\./)
  assert.doesNotMatch(querySource, /"page"[\s\S]*?seo\{title, description/)
})

test('optional media presentation metadata stays out of the normal editing surface', async () => {
  const [mediaSchema, accessibilityField, imagePlacementSchema, projectSchema, homePageSchema] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/schemas/objects/media.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/components/PrototypeMediaAccessibilityField.tsx'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/schemas/objects/imagePlacement.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/schemas/documents/project.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/schemas/documents/homePage.ts'), 'utf8'),
  ])
  const captionBlock = mediaSchema.slice(mediaSchema.indexOf("name: 'caption'"), mediaSchema.indexOf('preview:'))
  const displayModeBlock = mediaSchema.slice(mediaSchema.indexOf("name: 'displayMode'"), mediaSchema.indexOf("name: 'caption'"))
  assert.match(captionBlock, /hidden: true/)
  assert.doesNotMatch(captionBlock, /Rule\.required/)
  assert.match(displayModeBlock, /fieldset: 'advanced'/)
  assert.doesNotMatch(displayModeBlock, /Rule\.required/)
  assert.match(mediaSchema, /options: \{hotspot: true\}/)
  assert.match(imagePlacementSchema, /options: \{hotspot: true\}/)
  assert.doesNotMatch(mediaSchema, /crop.*Rule\.required|hotspot.*Rule\.required/s)
  assert.match(mediaSchema, /hidden: shouldHideMediaAlt/)
  assert.match(mediaSchema, /name: 'decorative',[\s\S]*?initialValue: true/)
  assert.match(accessibilityField, /Media adds information beyond the text/)
  assert.match(accessibilityField, /not already explained by the prototype tabs/)
  assert.match(accessibilityField, /defaultsDecorative && props\.value === undefined/)
  assert.match(accessibilityField, /checked \? set\(false\) : unset\(\)/)
  const homepageSummaryBlock = projectSchema.slice(
    projectSchema.indexOf("name: 'homepageSummary'"),
    projectSchema.indexOf("name: 'facts'"),
  )
  assert.match(homepageSummaryBlock, /Rule\.max\(250\)\.warning\('Over the recommended 250 characters\. Longer copy is allowed\.'\)/)
  assert.doesNotMatch(homepageSummaryBlock, /Rule\.required\(\)\.max\(/)
  assert.match(projectSchema, /Contribution summary is required for the current project/)
  const retiredDialogSummary = projectSchema.slice(
    projectSchema.indexOf("name: 'modalSummary'"),
    projectSchema.indexOf("name: 'primaryMedia'"),
  )
  assert.match(retiredDialogSummary, /hidden: true/)
  assert.match(homePageSchema, /validation: \(Rule\) => Rule\.required\(\)/)
})
