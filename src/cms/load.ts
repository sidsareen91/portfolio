import {localHomePagePayload, type HomePagePayload} from '../content/portfolio'
import {adaptCmsPayload} from './adapter'
import {sanityClient} from './config'
import {HOME_PAGE_QUERY} from './query'
import type {RawCmsPayload} from './types'
import {validateHomePagePayload} from './validation'

export async function loadHomePagePayload(): Promise<HomePagePayload> {
  if (!sanityClient) return localHomePagePayload

  const raw = await sanityClient.fetch<RawCmsPayload>(HOME_PAGE_QUERY)
  const payload = adaptCmsPayload(raw)
  validateHomePagePayload(payload)
  return payload
}
