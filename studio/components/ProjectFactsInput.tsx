import {Box, Button, Card, Flex, Text} from '@sanity/ui'
import {set, type ArrayOfObjectsInputProps} from 'sanity'

type LegacyProjectFact = string

type ProjectFactValue = {
  _key?: string
  _type?: 'projectFact'
  text?: string
  color?: string
}

let projectFactKeySequence = 0

function createProjectFactKey(now = Date.now()) {
  projectFactKeySequence = (projectFactKeySequence + 1) % 1_679_616
  return `fact${now.toString(36)}${projectFactKeySequence.toString(36).padStart(4, '0')}`
}

export function ProjectFactsInput(props: ArrayOfObjectsInputProps) {
  const values = (props.value ?? []) as unknown as Array<LegacyProjectFact | ProjectFactValue>
  const legacyCount = values.filter((value) => typeof value === 'string').length
  const editorProps = legacyCount > 0
    ? {...props, readOnly: true}
    : props

  const enableColors = () => {
    const normalized = values.map((value) => {
      if (typeof value !== 'string') return value

      return {
        _key: createProjectFactKey(),
        _type: 'projectFact' as const,
        text: value,
        color: 'yellow',
      }
    })

    props.onChange(set(normalized))
  }

  return (
    <Flex direction="column" gap={3}>
      {legacyCount > 0 && (
        <Card border padding={3} radius={2} tone="caution">
          <Flex align="center" gap={3} justify="space-between" wrap="wrap">
            <Box flex={1}>
              <Flex direction="column" gap={2}>
                <Text size={1} weight="semibold">Enable colors for existing facts</Text>
                <Text muted size={1}>
                  Converts the existing text-only facts without changing their wording or order.
                  They start with the Yellow badge and can then be recolored individually.
                </Text>
              </Flex>
            </Box>
            <Button
              fontSize={1}
              mode="ghost"
              onClick={enableColors}
              text={`Enable colors (${legacyCount})`}
              tone="primary"
            />
          </Flex>
        </Card>
      )}
      {props.renderDefault(editorProps)}
    </Flex>
  )
}
