import {Badge, Flex} from '@sanity/ui'
import type {TextInputProps} from 'sanity'

export const SUMMARY_RECOMMENDED_CHARACTER_COUNT = 250

export function getSummaryCharacterCount(value: unknown): number {
  return typeof value === 'string' ? value.length : 0
}

export function SummaryTextInput(props: TextInputProps) {
  const characterCount = getSummaryCharacterCount(props.value)
  const isOverRecommendation = characterCount > SUMMARY_RECOMMENDED_CHARACTER_COUNT

  return (
    <Flex direction="column" gap={2}>
      {props.renderDefault(props)}
      <Flex justify="flex-end">
        <Badge
          aria-label={`${characterCount} characters; ${SUMMARY_RECOMMENDED_CHARACTER_COUNT} recommended`}
          fontSize={1}
          tone={isOverRecommendation ? 'caution' : 'default'}
        >
          {characterCount} / {SUMMARY_RECOMMENDED_CHARACTER_COUNT} recommended
        </Badge>
      </Flex>
    </Flex>
  )
}
