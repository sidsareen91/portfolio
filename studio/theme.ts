import {buildTheme} from '@sanity/ui/theme'

/**
 * Keep Sanity's control-sized spacing intact while tightening the large gaps
 * used between document fields, nested objects, array editors, and dialogs.
 */
export const compactStudioTheme = buildTheme({
  space: [
    0,
    4,
    8,
    12,
    16,
    24,
    36,
    56,
    88,
    136,
  ],
})
