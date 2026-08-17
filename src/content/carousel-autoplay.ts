export const DEFAULT_CAROUSEL_SWITCH_SECONDS = 7
export const MIN_CAROUSEL_SWITCH_SECONDS = 1
export const MAX_CAROUSEL_SWITCH_SECONDS = 60

export type CarouselAutoplaySettings = {
  enabled: boolean
  seconds: number
}

export function resolveCarouselAutoplaySettings(
  enabled: boolean | undefined,
  seconds: number | undefined,
  defaultEnabled: boolean,
): CarouselAutoplaySettings {
  return {
    enabled: enabled ?? defaultEnabled,
    seconds: typeof seconds === 'number' ? seconds : DEFAULT_CAROUSEL_SWITCH_SECONDS,
  }
}

export function validateCarouselAutoplaySettings(
  settings: CarouselAutoplaySettings,
  path: string,
  errors: string[],
) {
  if (!Number.isInteger(settings.seconds)
    || settings.seconds < MIN_CAROUSEL_SWITCH_SECONDS
    || settings.seconds > MAX_CAROUSEL_SWITCH_SECONDS) {
    errors.push(
      `${path}.seconds must be a whole number between ${MIN_CAROUSEL_SWITCH_SECONDS} and ${MAX_CAROUSEL_SWITCH_SECONDS}`,
    )
  }
}
