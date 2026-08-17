import {TextInput} from '@sanity/ui'
import {set, unset, type UrlInputProps} from 'sanity'
import {normalizeBlueprintUrl} from '../../src/content/blueprint-url'

export function BlueprintUrlInput(props: UrlInputProps) {
  return (
    <TextInput
      {...props.elementProps}
      type="url"
      value={props.value ?? ''}
      onChange={(event) => {
        const nextValue = event.currentTarget.value
        props.onChange(nextValue ? set(normalizeBlueprintUrl(nextValue)) : unset())
      }}
    />
  )
}
