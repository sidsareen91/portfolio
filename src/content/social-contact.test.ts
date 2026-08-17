import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'
import {adaptCmsPayload} from '../cms/adapter'

test('Studio and CMS expose only social URLs while icon labels remain code-owned', async () => {
  const [schema, query, types, adapter] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/schemas/documents/siteSettings.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/cms/query.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/cms/types.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/cms/adapter.ts'), 'utf8'),
  ])

  for (const source of [schema, query, types, adapter]) {
    assert.doesNotMatch(source, /linkedinValue|discordValue/)
  }
  assert.match(schema, /name: 'linkedinUrl'/)
  assert.match(schema, /name: 'discordUrl'/)
})

test('social icons are created from real URLs without editable display values', () => {
  const {site} = adaptCmsPayload({
    settings: {
      linkedinUrl: 'https://www.linkedin.com/in/example',
      discordUrl: 'https://discord.com/users/example',
    },
  })

  assert.deepEqual(
    site.contact.links.filter(({label}) => label === 'LinkedIn' || label === 'Discord'),
    [
      {label: 'LinkedIn', value: 'LinkedIn', href: 'https://www.linkedin.com/in/example'},
      {label: 'Discord', value: 'Discord', href: 'https://discord.com/users/example'},
    ],
  )
})
