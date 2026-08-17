import {HighlightIcon} from '@sanity/icons/Highlight'
import type {BlockDecoratorProps} from 'sanity'

const HERO_CORAL = '#f45532'

export const HeroAccentIcon = HighlightIcon

export function HeroAccentDecorator(props: BlockDecoratorProps) {
  return (
    <span
      data-hero-accent-preview
      style={{
        color: HERO_CORAL,
        fontWeight: 700,
      }}
    >
      {props.children}
    </span>
  )
}
