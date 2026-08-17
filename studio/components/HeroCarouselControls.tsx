import {Box, Checkbox, Flex, Text, TextInput} from '@sanity/ui'
import {
  set,
  unset,
  type ArrayFieldProps,
  type BooleanFieldProps,
  type BooleanInputProps,
  type NumberFieldProps,
  type NumberInputProps,
} from 'sanity'

const CAROUSEL_ARRAY_SPACING_ADJUSTMENT = 24

const autoSwitchLabels: Record<string, string> = {
  autoSwitchItems: 'Auto-switch Hero',
  designLabAutoSwitchItems: 'Auto-switch Design Lab',
  galleryAutoSwitchItems: 'Auto-switch gallery',
}

const autoSwitchDefaults: Record<string, boolean> = {
  autoSwitchItems: true,
  designLabAutoSwitchItems: false,
  galleryAutoSwitchItems: true,
}

function autoSwitchLabel(fieldName: string) {
  return autoSwitchLabels[fieldName] ?? 'Auto-switch items'
}

export function CarouselFollowingArrayField(props: ArrayFieldProps) {
  return (
    <Box style={{marginTop: -CAROUSEL_ARRAY_SPACING_ADJUSTMENT}}>
      {props.renderDefault(props)}
    </Box>
  )
}

export function HeroMediaField(props: ArrayFieldProps) {
  return <CarouselFollowingArrayField {...props} />
}

export function CarouselAutoSwitchField(props: BooleanFieldProps) {
  return (
    <Flex align="center" gap={2} style={{minHeight: 35}}>
      <Box>{props.children}</Box>
      <Text as="label" htmlFor={props.inputId} size={1} weight="medium">
        {autoSwitchLabel(props.name)}
      </Text>
    </Flex>
  )
}

export function CarouselAutoSwitchInput(props: BooleanInputProps) {
  const {elementProps} = props
  const fieldName = props.schemaType.name

  return (
    <Checkbox
      aria-label={autoSwitchLabel(fieldName)}
      checked={props.value ?? autoSwitchDefaults[fieldName] ?? false}
      id={elementProps.id}
      onBlur={elementProps.onBlur}
      onChange={(event) => props.onChange(event.currentTarget.checked ? set(true) : set(false))}
      onFocus={elementProps.onFocus}
      readOnly={elementProps.readOnly}
      ref={elementProps.ref}
    />
  )
}

export function CarouselSwitchTimeField(props: NumberFieldProps) {
  return (
    <Flex align="center" gap={3} style={{minHeight: 35}}>
      <Text as="label" htmlFor={props.inputId} size={1} weight="medium">
        Switch time
      </Text>
      <Box style={{width: 88}}>{props.children}</Box>
      <Text muted size={1}>
        seconds
      </Text>
    </Flex>
  )
}

export function CarouselSwitchTimeInput(props: NumberInputProps) {
  return (
    <TextInput
      {...props.elementProps}
      aria-label="Carousel auto-switch time in seconds"
      max={60}
      min={1}
      placeholder="7"
      type="number"
      value={props.value ?? ''}
      onChange={(event) => {
        const nextValue = event.currentTarget.value
        props.onChange(nextValue === '' ? unset() : set(Number(nextValue)))
      }}
    />
  )
}

export const HeroAutoSwitchField = CarouselAutoSwitchField
export const HeroAutoSwitchInput = CarouselAutoSwitchInput
export const HeroSwitchTimeField = CarouselSwitchTimeField
export const HeroSwitchTimeInput = CarouselSwitchTimeInput
