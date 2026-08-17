import {Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {useCallback, useRef, useState, type ChangeEvent, type DragEvent} from 'react'
import {
  insert,
  LinearProgress,
  setIfMissing,
  useClient,
  useFormValue,
  type ArrayOfObjectsInputProps,
  type InputProps,
} from 'sanity'

const API_VERSION = '2026-08-11'
const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)$/i
const IMAGE_MIME_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])
const VIDEO_EXTENSION = /\.(?:mp4|webm)$/i
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm'])

type UploadableFile = Pick<File, 'name' | 'type'>

type SanityImageValue = {
  _type?: 'image'
  asset?: {_type?: 'reference'; _ref?: string}
  crop?: unknown
  hotspot?: unknown
}

type PrimaryMediaValue = {
  kind?: 'image' | 'video'
  image?: SanityImageValue
}

type ImageMediaArrayItem = {
  _key: string
  _type: 'media'
  kind: 'image'
  decorative: true
  image: {
    _type: 'image'
    asset: {_type: 'reference'; _ref: string}
  }
}

type VideoMediaArrayItem = {
  _key: string
  _type: 'media'
  kind: 'video'
  decorative: true
  videoFile: {
    _type: 'file'
    asset: {_type: 'reference'; _ref: string}
  }
  poster?: SanityImageValue
}

type MediaArrayItem = ImageMediaArrayItem | VideoMediaArrayItem

type UploadResult =
  | {file: File; item: MediaArrayItem}
  | {file: File; error: string}

type UploadError = {
  message?: unknown
  statusCode?: unknown
  responseBody?: unknown
}

export function isBulkUploadImage(file: UploadableFile): boolean {
  return IMAGE_MIME_TYPES.has(file.type.toLowerCase())
    || (!file.type && IMAGE_EXTENSION.test(file.name))
}

export function isBulkUploadVideo(file: UploadableFile): boolean {
  return VIDEO_MIME_TYPES.has(file.type.toLowerCase())
    || (!file.type && VIDEO_EXTENSION.test(file.name))
}

export function isBulkUploadMedia(file: UploadableFile): boolean {
  return isBulkUploadImage(file) || isBulkUploadVideo(file)
}

export function buildBulkMediaItem(assetId: string, key: string): ImageMediaArrayItem {
  return {
    _key: key,
    _type: 'media',
    kind: 'image',
    decorative: true,
    image: {
      _type: 'image',
      asset: {_type: 'reference', _ref: assetId},
    },
  }
}

export function resolveProjectThumbnailPoster(
  primaryMedia: PrimaryMediaValue | null | undefined,
): SanityImageValue | undefined {
  const image = primaryMedia?.kind === 'image' ? primaryMedia.image : undefined
  const assetRef = image?.asset?._ref
  if (!assetRef) return undefined

  return {
    ...image,
    _type: 'image',
    asset: {_type: 'reference', _ref: assetRef},
  }
}

export function buildBulkVideoItem(
  assetId: string,
  key: string,
  poster?: SanityImageValue,
): VideoMediaArrayItem {
  return {
    _key: key,
    _type: 'media',
    kind: 'video',
    decorative: true,
    videoFile: {
      _type: 'file',
      asset: {_type: 'reference', _ref: assetId},
    },
    ...(poster ? {poster} : {}),
  }
}

function responseErrorMessage(responseBody: unknown): string | undefined {
  if (!responseBody || typeof responseBody !== 'object') return undefined

  const body = responseBody as {
    message?: unknown
    error?: unknown
  }

  if (typeof body.message === 'string' && body.message.trim()) return body.message.trim()
  if (typeof body.error === 'string' && body.error.trim()) return body.error.trim()
  if (body.error && typeof body.error === 'object') {
    const nestedError = body.error as {description?: unknown; message?: unknown}
    if (typeof nestedError.description === 'string' && nestedError.description.trim()) {
      return nestedError.description.trim()
    }
    if (typeof nestedError.message === 'string' && nestedError.message.trim()) {
      return nestedError.message.trim()
    }
  }

  return undefined
}

export function formatBulkUploadError(error: unknown): string {
  if (!(error && typeof error === 'object')) return 'Unknown upload error.'

  const uploadError = error as UploadError
  const responseMessage = responseErrorMessage(uploadError.responseBody)
  const message = responseMessage
    || (typeof uploadError.message === 'string' && uploadError.message.trim()
      ? uploadError.message.trim()
      : 'Unknown upload error.')
  const status = typeof uploadError.statusCode === 'number'
    ? `Sanity returned ${uploadError.statusCode}. `
    : ''

  return `${status}${message}`
}

let mediaKeySequence = 0

export function createBulkMediaKey(now = Date.now()) {
  mediaKeySequence = (mediaKeySequence + 1) % 1_679_616
  return `media${now.toString(36)}${mediaKeySequence.toString(36).padStart(4, '0')}`
}

export function aggregateUploadProgress(progressByFile: Record<string, number>, total: number) {
  if (total <= 0) return 0
  const progress = Object.values(progressByFile)
    .reduce((sum, value) => sum + Math.min(100, Math.max(0, value)), 0)
  return Math.round(progress / total)
}

function fileNames(files: File[]) {
  return files.map(({name}) => name).join(', ')
}

export function MediaArrayInput(props: InputProps) {
  const arrayProps = props as unknown as ArrayOfObjectsInputProps<MediaArrayItem>
  const client = useClient({apiVersion: API_VERSION})
  const primaryMedia = useFormValue(['primaryMedia']) as PrimaryMediaValue | null | undefined
  const defaultVideoPoster = resolveProjectThumbnailPoster(primaryMedia)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)
  const [progressByFile, setProgressByFile] = useState<Record<string, number>>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const uploadFiles = useCallback(async (incomingFiles: File[]) => {
    if (uploading || arrayProps.readOnly) return

    const accepted = incomingFiles.filter(isBulkUploadMedia)
    const skipped = incomingFiles.filter((file) => !isBulkUploadMedia(file))

    setSuccessMessage('')
    setErrorMessage(skipped.length
      ? `Skipped unsupported files: ${fileNames(skipped)}. Use JPG, PNG, WebP, GIF, AVIF, MP4, or WebM.`
      : '')

    if (!accepted.length) return

    setUploading(true)
    setCompleted(0)
    setTotal(accepted.length)
    setProgressByFile(Object.fromEntries(
      accepted.map((file, index) => [`${index}:${file.name}`, 0]),
    ))

    const results = await Promise.all(accepted.map(async (file, index): Promise<UploadResult> => {
      const progressKey = `${index}:${file.name}`
      try {
        const isVideo = isBulkUploadVideo(file)
        const assetId = await new Promise<string>((resolve, reject) => {
          let resolved = false
          client.observable.assets.upload(isVideo ? 'file' : 'image', file, {
            tag: 'asset.upload',
          }).subscribe({
            next: (event) => {
              if (event.type === 'progress' && event.stage === 'upload') {
                setProgressByFile((current) => ({
                  ...current,
                  [progressKey]: event.percent,
                }))
              }
              if (event.type === 'response') {
                resolved = true
                setProgressByFile((current) => ({...current, [progressKey]: 100}))
                resolve(event.body.document._id)
              }
            },
            error: reject,
            complete: () => {
              if (!resolved) reject(new Error('Upload ended before Sanity returned an asset.'))
            },
          })
        })
        return {
          file,
          item: isVideo
            ? buildBulkVideoItem(assetId, createBulkMediaKey(), defaultVideoPoster)
            : buildBulkMediaItem(assetId, createBulkMediaKey()),
        }
      } catch (error) {
        return {
          file,
          error: formatBulkUploadError(error),
        }
      } finally {
        setCompleted((count) => count + 1)
      }
    }))

    const uploadedItems = results.flatMap((result) => 'item' in result ? [result.item] : [])
    const uploadedVideos = uploadedItems.filter(
      (item): item is VideoMediaArrayItem => item.kind === 'video',
    )
    const videosMissingPoster = uploadedVideos.filter((item) => !item.poster)
    const failed = results.flatMap((result) => 'error' in result ? [result] : [])

    if (uploadedItems.length) {
      arrayProps.onChange([
        setIfMissing([]),
        insert(uploadedItems, 'after', [-1]),
      ])
      setSuccessMessage(
        uploadedVideos.length
          ? videosMissingPoster.length
            ? `Added ${uploadedItems.length} media item${uploadedItems.length === 1 ? '' : 's'} in file order. Add a cover image to each new video before publishing.`
            : `Added ${uploadedItems.length} media item${uploadedItems.length === 1 ? '' : 's'} in file order. The project thumbnail is the default video cover.`
          : `Added ${uploadedItems.length} media item${uploadedItems.length === 1 ? '' : 's'} in file order.`,
      )
      if (videosMissingPoster[0]) {
        setTimeout(() => arrayProps.onItemOpen([{_key: videosMissingPoster[0]._key}]), 0)
      }
    }

    if (failed.length) {
      const failureDetails = failed
        .map(({file, error}) => `${file.name}: ${error}`)
        .join(' ')
      const failedMessage = `Could not upload ${failureDetails}`
      setErrorMessage((current) => current ? `${current} ${failedMessage}` : failedMessage)
    }

    setUploading(false)
  }, [arrayProps, client, defaultVideoPoster, uploading])

  const hasDraggedFiles = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer.types).includes('Files')

  const handleDragEnterCapture = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    event.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeaveCapture = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    event.stopPropagation()

    const nextTarget = event.relatedTarget
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setDragActive(false)
    }
  }

  const handleDragOverCapture = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = uploading || arrayProps.readOnly ? 'none' : 'copy'
  }

  const handleDropCapture = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
    void uploadFiles(Array.from(event.dataTransfer.files))
  }

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    void uploadFiles(files)
  }

  const uploadPercent = aggregateUploadProgress(progressByFile, total)

  return (
    <div
      onDragEnterCapture={handleDragEnterCapture}
      onDragLeaveCapture={handleDragLeaveCapture}
      onDragOverCapture={handleDragOverCapture}
      onDropCapture={handleDropCapture}
    >
      <Stack gap={3}>
        <Card
          border
          padding={3}
          radius={2}
          tone={dragActive ? 'primary' : undefined}
          style={{borderStyle: 'dashed'}}
        >
          <Flex align="center" gap={3} justify="space-between" wrap="wrap">
            <Box style={{flex: '1 1 260px', minWidth: 0}}>
              <Stack gap={2}>
                <Text size={1} weight="semibold">
                  {dragActive ? 'Drop media to add it' : 'Add several media files at once'}
                </Text>
                <Text muted size={1}>
                  Drop JPG, PNG, WebP, GIF, AVIF, MP4, or WebM files anywhere in this list. {defaultVideoPoster
                    ? 'New videos use the project thumbnail as their default cover.'
                    : 'Videos open after upload so you can add their required cover image.'}
                </Text>
              </Stack>
            </Box>
            <Button
              disabled={uploading || arrayProps.readOnly}
              mode="ghost"
              text={uploading ? `Uploading ${uploadPercent}%` : 'Choose media'}
              onClick={() => inputRef.current?.click()}
            />
            <input
              ref={inputRef}
              accept="image/avif,image/gif,image/jpeg,image/png,image/webp,video/mp4,video/webm"
              aria-label="Choose multiple images or videos for this media collection"
              disabled={uploading || arrayProps.readOnly}
              hidden
              multiple
              type="file"
              onChange={handleFileSelection}
            />
          </Flex>
          {uploading && (
            <Stack gap={2} marginTop={3}>
              <Flex align="center" justify="space-between">
                <Text size={1} weight="semibold">Uploading media</Text>
                <Text muted size={1}>{uploadPercent}% · {completed} of {total} complete</Text>
              </Flex>
              <LinearProgress value={uploadPercent} />
            </Stack>
          )}
          {(successMessage || errorMessage) && (
            <Stack gap={2} marginTop={3}>
              {successMessage && (
                <Card padding={2} radius={1} tone="positive">
                  <Text size={1}>{successMessage}</Text>
                </Card>
              )}
              {errorMessage && (
                <Card padding={2} radius={1} role="alert" tone="critical">
                  <Text size={1}>{errorMessage}</Text>
                </Card>
              )}
            </Stack>
          )}
        </Card>
        {props.renderDefault(props)}
      </Stack>
    </div>
  )
}
