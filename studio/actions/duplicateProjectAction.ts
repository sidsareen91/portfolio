import type {DuplicateDocumentActionComponent} from 'sanity'

/**
 * A project copy must become a new document. The slug is deliberately cleared
 * so the editor generates or enters a new public URL identity for the copy.
 */
export function createProjectDuplicateAction(
  originalAction: DuplicateDocumentActionComponent,
): DuplicateDocumentActionComponent {
  const DuplicateProjectAction: DuplicateDocumentActionComponent = (props) => {
    const result = originalAction({
      ...props,
      mapDocument: ({slug: _slug, ...document}) => document,
    })

    return result ? {...result, label: 'Duplicate as new project'} : result
  }

  DuplicateProjectAction.action = 'duplicate'
  DuplicateProjectAction.displayName = 'DuplicateProjectAction'
  return DuplicateProjectAction
}
