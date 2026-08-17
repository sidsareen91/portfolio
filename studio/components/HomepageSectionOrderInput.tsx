import {Box, Button, Card, Flex, Stack, Text, Tooltip} from '@sanity/ui'
import {EyeClosedIcon} from '@sanity/icons/EyeClosed'
import {EyeOpenIcon} from '@sanity/icons/EyeOpen'
import {type ArrayOfObjectsInputProps, type ObjectItemProps, set} from 'sanity'
import {
  DEFAULT_HOMEPAGE_SECTION_SETTINGS,
  HOMEPAGE_SECTION_OPTIONS,
  type HomepageSectionId,
} from '../../src/content/homepage-sections'

type HomepageSectionSettingValue = {
  _key?: string
  _type?: 'homepageSectionSetting'
  section?: HomepageSectionId
  visible?: boolean
}

const sectionTitles = new Map<string, string>(
  HOMEPAGE_SECTION_OPTIONS.map(({title, value}) => [value, title]),
)

function cloneDefaultSectionSettings() {
  return DEFAULT_HOMEPAGE_SECTION_SETTINGS.map((setting) => ({...setting}))
}

export function HomepageSectionOrderItem(props: ObjectItemProps) {
  const value = props.value as HomepageSectionSettingValue
  const isVisible = value.visible !== false
  const sectionTitle = sectionTitles.get(value.section ?? '') ?? 'Homepage section'
  const actionLabel = `${isVisible ? 'Hide' : 'Show'} ${sectionTitle} section`

  const toggleVisibility = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    props.inputProps.onChange(set(!isVisible, ['visible']))
  }

  return (
    <Flex
      align="center"
      data-homepage-section-visible={isVisible ? 'true' : 'false'}
      style={{opacity: isVisible ? 1 : 0.58, position: 'relative'}}
    >
      <Box flex={1} style={{minWidth: 0, paddingInlineEnd: '48px'}}>
        {props.renderDefault(props)}
      </Box>
      <Box style={{insetInlineEnd: '4px', position: 'absolute', top: '50%', transform: 'translateY(-50%)'}}>
        <Tooltip
          content={<Box padding={2}><Text size={1}>{actionLabel}</Text></Box>}
          placement="top"
          portal
        >
          <Button
            aria-label={actionLabel}
            aria-pressed={isVisible}
            data-homepage-section-visibility-toggle
            disabled={props.readOnly}
            icon={isVisible ? EyeOpenIcon : EyeClosedIcon}
            mode="bleed"
            onClick={toggleVisibility}
            padding={2}
            tone={isVisible ? 'default' : 'caution'}
          />
        </Tooltip>
      </Box>
    </Flex>
  )
}

export function HomepageSectionOrderInput(
  props: ArrayOfObjectsInputProps,
) {
  const hasOrder = Array.isArray(props.value) && props.value.length > 0
  const values = (props.value ?? []) as unknown[]
  const legacySections = values.filter((value): value is HomepageSectionId => typeof value === 'string')
  const hasLegacyOrder = legacySections.length > 0

  const enableVisibilityControls = () => {
    props.onChange(set(legacySections.map((section) => ({
      _key: section,
      _type: 'homepageSectionSetting',
      section,
      visible: true,
    }))))
  }

  return (
    <Stack gap={3}>
      {!hasOrder && (
        <Card border padding={3} radius={2} tone="primary">
          <Stack gap={3}>
            <Text size={1}>
              Start with the website's current section order, then drag items to rearrange it.
            </Text>
            <Button
              mode="ghost"
              text="Use current website order"
              onClick={() => props.onChange(set(cloneDefaultSectionSettings()))}
            />
          </Stack>
        </Card>
      )}
      {hasLegacyOrder && (
        <Card border padding={3} radius={2} tone="primary">
          <Stack gap={3}>
            <Text size={1}>
              Enable visibility controls without changing the current section order.
            </Text>
            <Button
              mode="ghost"
              text="Enable hide and show controls"
              onClick={enableVisibilityControls}
            />
          </Stack>
        </Card>
      )}
      {props.renderDefault(hasLegacyOrder ? {...props, readOnly: true} : props)}
    </Stack>
  )
}
