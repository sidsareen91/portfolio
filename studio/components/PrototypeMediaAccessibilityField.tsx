import {Checkbox, Flex, Text} from '@sanity/ui'
import {
  FormField,
  set,
  unset,
  useFormValue,
  type BooleanFieldProps,
  type BooleanInputProps,
} from 'sanity'
import {isDefaultDecorativePlacement} from '../../src/content/media-accessibility'

function isPrototypeDocument(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && (value as {_type?: unknown})._type === 'prototype')
}

export function PrototypeMediaAccessibilityField(props: BooleanFieldProps) {
  const document = useFormValue([])
  if (!isPrototypeDocument(document)) return props.renderDefault(props)

  return (
    <FormField
      __unstable_presence={props.presence}
      description="Only enable this when the media communicates useful information that is not already explained by the prototype tabs."
      inputId={props.inputId}
      level={props.level}
      path={props.path}
      title="Media adds information beyond the text"
      validation={props.validation}
    >
      {props.children}
    </FormField>
  )
}

export function PrototypeMediaAccessibilityInput(props: BooleanInputProps) {
  const document = useFormValue([])
  if (!isPrototypeDocument(document)) {
    const defaultsDecorative = isDefaultDecorativePlacement({document, path: props.path})
    return props.renderDefault(
      defaultsDecorative && props.value === undefined ? {...props, value: true} : props,
    )
  }

  const {elementProps} = props
  const meaningful = props.value === false

  return (
    <Flex align="center" gap={3}>
      <Checkbox
        aria-describedby={elementProps['aria-describedby']}
        aria-label="Media adds information beyond the text"
        checked={meaningful}
        id={elementProps.id}
        onBlur={elementProps.onBlur}
        onChange={(event) => props.onChange(event.currentTarget.checked ? set(false) : unset())}
        onFocus={elementProps.onFocus}
        readOnly={elementProps.readOnly}
        ref={elementProps.ref}
      />
      <Text as="label" htmlFor={elementProps.id} size={1}>
        Yes, this media adds information beyond the prototype tabs.
      </Text>
    </Flex>
  )
}
