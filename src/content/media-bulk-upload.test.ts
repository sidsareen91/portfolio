import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'
import {
  aggregateUploadProgress,
  buildBulkMediaItem,
  buildBulkVideoItem,
  createBulkMediaKey,
  formatBulkUploadError,
  isBulkUploadImage,
  isBulkUploadMedia,
  isBulkUploadVideo,
  resolveProjectThumbnailPoster,
} from '../../studio/components/MediaArrayInput'

test('aggregate upload progress reflects concurrent file transfer percentages', () => {
  assert.equal(aggregateUploadProgress({'0:first.mp4': 25, '1:second.webp': 75}, 2), 50)
  assert.equal(aggregateUploadProgress({'0:first.mp4': 120, '1:second.webp': -10}, 2), 50)
  assert.equal(aggregateUploadProgress({}, 0), 0)
})

test('bulk media upload accepts image and GIF files without accepting arbitrary files', () => {
  assert.equal(isBulkUploadImage({name: 'cover.jpg', type: 'image/jpeg'}), true)
  assert.equal(isBulkUploadImage({name: 'cover.png', type: 'image/png'}), true)
  assert.equal(isBulkUploadImage({name: 'cover.webp', type: 'image/webp'}), true)
  assert.equal(isBulkUploadImage({name: 'gameplay.gif', type: 'image/gif'}), true)
  assert.equal(isBulkUploadImage({name: 'export.webp', type: ''}), true)
  assert.equal(isBulkUploadImage({name: 'clip.mp4', type: 'video/mp4'}), false)
  assert.equal(isBulkUploadImage({name: 'vector.svg', type: 'image/svg+xml'}), false)
  assert.equal(isBulkUploadImage({name: 'notes.pdf', type: 'application/pdf'}), false)
})

test('bulk media upload accepts supported videos and rejects unsupported video formats', () => {
  assert.equal(isBulkUploadVideo({name: 'gameplay.mp4', type: 'video/mp4'}), true)
  assert.equal(isBulkUploadVideo({name: 'gameplay.webm', type: ''}), true)
  assert.equal(isBulkUploadVideo({name: 'gameplay.mov', type: 'video/quicktime'}), false)
  assert.equal(isBulkUploadMedia({name: 'cover.webp', type: 'image/webp'}), true)
  assert.equal(isBulkUploadMedia({name: 'gameplay.mp4', type: 'video/mp4'}), true)
})

test('bulk media keys remain unique without secure-context browser APIs', () => {
  const first = createBulkMediaKey(1_700_000_000_000)
  const second = createBulkMediaKey(1_700_000_000_000)

  assert.notEqual(first, second)
  assert.match(first, /^[a-zA-Z0-9_-]+$/)
})

test('bulk upload errors preserve actionable Sanity response details', () => {
  assert.equal(
    formatBulkUploadError({
      statusCode: 403,
      message: 'Generic client error',
      responseBody: {error: {description: 'Insufficient permissions to upload assets'}},
    }),
    'Sanity returned 403. Insufficient permissions to upload assets',
  )
  assert.equal(
    formatBulkUploadError(new Error('Network request failed')),
    'Network request failed',
  )
})

test('each bulk upload becomes a decorative image media item', () => {
  assert.deepEqual(buildBulkMediaItem('image-example-1600x900-jpg', 'media-key'), {
    _key: 'media-key',
    _type: 'media',
    kind: 'image',
    decorative: true,
    image: {
      _type: 'image',
      asset: {_type: 'reference', _ref: 'image-example-1600x900-jpg'},
    },
  })
})

test('each bulk video upload becomes a decorative video item awaiting its poster', () => {
  assert.deepEqual(buildBulkVideoItem('file-example-mp4', 'video-key'), {
    _key: 'video-key',
    _type: 'media',
    kind: 'video',
    decorative: true,
    videoFile: {
      _type: 'file',
      asset: {_type: 'reference', _ref: 'file-example-mp4'},
    },
  })
})

test('project thumbnail image becomes the default poster for a newly uploaded video', () => {
  const poster = resolveProjectThumbnailPoster({
    kind: 'image',
    image: {
      _type: 'image',
      asset: {_type: 'reference', _ref: 'image-project-thumbnail'},
      hotspot: {x: 0.5, y: 0.5},
    },
  })

  assert.deepEqual(poster, {
    _type: 'image',
    asset: {_type: 'reference', _ref: 'image-project-thumbnail'},
    hotspot: {x: 0.5, y: 0.5},
  })
  assert.deepEqual(buildBulkVideoItem('file-example-mp4', 'video-key', poster).poster, poster)
  assert.equal(resolveProjectThumbnailPoster({kind: 'video'}), undefined)
})

test('Hero and project gallery arrays expose the same multi-file uploader', async () => {
  const [homePageSchema, projectSchema, uploader] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/schemas/documents/homePage.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/schemas/documents/project.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/components/MediaArrayInput.tsx'), 'utf8'),
  ])

  assert.match(homePageSchema, /components: \{field: HeroMediaField, input: MediaArrayInput\}/)
  assert.match(projectSchema, /components: \{field: CarouselFollowingArrayField, input: MediaArrayInput\}/)
  assert.match(uploader, /multiple/)
  assert.match(uploader, /insert\(uploadedItems, 'after', \[-1\]\)/)
  assert.match(uploader, /client\.observable\.assets\.upload\(isVideo \? 'file' : 'image'/)
  assert.match(uploader, /event\.type === 'progress' && event\.stage === 'upload'/)
  assert.match(uploader, /<LinearProgress value=\{uploadPercent\} \/>/)
  assert.match(uploader, /useFormValue\(\['primaryMedia'\]\)/)
  assert.match(uploader, /arrayProps\.onItemOpen\(\[\{_key: videosMissingPoster\[0\]\._key\}\]\)/)
  assert.match(uploader, /Add a cover image to each new video before publishing/)
  assert.match(uploader, /The project thumbnail is the default video cover/)
  assert.match(uploader, /onDropCapture=\{handleDropCapture\}/)
  assert.match(uploader, /event\.stopPropagation\(\)/)
  assert.match(uploader, /Array\.from\(event\.dataTransfer\.types\)\.includes\('Files'\)/)
  assert.match(uploader, /tag: 'asset\.upload'/)
  assert.doesNotMatch(uploader, /preserveFilename/)
  assert.doesNotMatch(uploader, /crypto\.randomUUID/)
})
