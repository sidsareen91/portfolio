import {Box, Stack, Text} from '@sanity/ui'
import type {FieldProps} from 'sanity'

const sectionTitles: Record<string, string> = {
  hero: 'Hero',
  stats: 'Achievements',
  featuredProjectKicker: 'Showcased Project',
  approach: 'Design Approach',
  designLabTitle: 'Design Lab',
  shippedWork: 'Shipped Work',
  about: 'About',
  contact: 'Contact',
}

const fieldsWithRepeatedSectionLabel = new Set([
  'hero',
  'stats',
  'approach',
  'shippedWork',
  'about',
  'contact',
])

export function HomepageSectionField(props: FieldProps) {
  const sectionTitle = sectionTitles[props.name]
  if (!sectionTitle) return props.renderDefault(props)

  const fieldProps = fieldsWithRepeatedSectionLabel.has(props.name)
    ? {...props, title: undefined}
    : props

  return (
    <Stack gap={3} data-homepage-section={props.name}>
      <Box paddingTop={4} style={{position: 'relative'}}>
        <Box
          aria-hidden
          data-homepage-section-divider
          style={{
            borderTop: '2px solid var(--card-focus-ring-color, #8f9cff)',
            left: '50%',
            opacity: 0.9,
            pointerEvents: 'none',
            position: 'absolute',
            top: 0,
            transform: 'translateX(-50%)',
            width: '100vw',
          }}
        />
        <Text
          size={1}
          weight="semibold"
          style={{
            color: 'var(--card-focus-ring-color, #aeb8ff)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {sectionTitle}
        </Text>
      </Box>
      {props.renderDefault(fieldProps)}
    </Stack>
  )
}
