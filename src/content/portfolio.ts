import type {HeroHeadlineSegment} from './hero-headline';
import type {CarouselAutoplaySettings} from './carousel-autoplay';
import {
  DEFAULT_HOMEPAGE_SECTION_ORDER,
  type HomepageSectionId,
} from './homepage-sections';

export type MediaItem = {
  kind?: 'image' | 'video';
  src: string;
  alt: string;
  poster?: string;
  decorative?: boolean;
  fit?: 'cover' | 'contain';
};

export type ProjectExternalLink = {
  kind: 'googlePlay' | 'appStore' | 'official';
  label: 'Google Play' | 'App Store' | 'Official Site';
  href: string;
};

export type ProjectFactColor = 'yellow' | 'mint' | 'coral' | 'lavender';

export type ProjectFact = {
  text: string;
  color: ProjectFactColor;
};

export type ShippedProject = {
  slug: string;
  title: string;
  role: string;
  media: MediaItem;
  summary: string;
  facts: ProjectFact[];
  contribution?: string;
  detailMedia: MediaItem[];
  externalLinks: ProjectExternalLink[];
};

export type FeaturedProject = {
  slug: string;
  title: string;
  role: string;
  summary: string;
  support: string;
  facts: ProjectFact[];
  media: MediaItem[];
};

export type PrototypeTagColor = ProjectFactColor;

export type PrototypeFolderTab = {
  key: string;
  label: string;
  content?: PrototypeTabContentNode[];
  body?: string;
  items?: string[];
};

export type Prototype = {
  slug: string;
  title: string;
  tag: {
    label: string;
    color: PrototypeTagColor;
  };
  tabs: PrototypeFolderTab[];
  media: MediaItem;
  blueprintUrl?: string;
  blueprintCtaEnabled?: boolean;
  blueprintCtaLabel?: string;
};

export type ContactLink = {
  label: string;
  value: string;
  href?: string;
};

export type SiteContent = {
  sectionOrder: HomepageSectionId[];
  profile: {
    name: string;
    role: string;
    location: string;
    email: string;
    portrait: MediaItem;
  };
  hero: {
    eyebrow: string;
    headline: HeroHeadlineSegment[];
    media: MediaItem[];
  };
  carousels: {
    hero: CarouselAutoplaySettings;
    bellyBrawl: CarouselAutoplaySettings;
    designLab: CarouselAutoplaySettings;
  };
  stats: Array<{value: string; label: string}>;
  bellyBrawl: FeaturedProject;
  approach: Array<{number: string; title: string; description: string}>;
  prototypes: Prototype[];
  shippedWork: ShippedProject[];
  about: {
    bio: string;
    tags: string[];
  };
  contact: {
    message: string;
    links: ContactLink[];
  };
};

export type HomePageCopy = {
  featuredProjectKicker: string;
  approachTitle: string;
  designLabTitle: string;
  shippedWorkKicker: string;
  shippedWorkTitle: string;
  aboutKicker: string;
  aboutHeading: string;
  contactKicker: string;
};

export type SeoContent = {
  title: string;
  description: string;
  canonicalUrl?: string;
  socialImage?: MediaItem;
};

export type HomePagePayload = {
  site: SiteContent;
  pageCopy: HomePageCopy;
  seo: SeoContent;
};

export const pageCopy: HomePageCopy = {
  featuredProjectKicker: 'Showcased project',
  approachTitle: 'Design approach',
  designLabTitle: 'Design lab',
  shippedWorkKicker: 'Production work',
  shippedWorkTitle: 'Selected shipped work',
  aboutKicker: 'About me',
  aboutHeading: 'Hi, I’m Siddharth.',
  contactKicker: 'Get in touch',
};

export const seo: SeoContent = {
  title: 'Siddharth Sareen — Senior Game Designer',
  description: 'I’m a Senior Game Designer and Technical Game Designer focused on playable systems, in-engine prototypes, and player-focused experiences.',
};

export const site: SiteContent = {
  sectionOrder: [...DEFAULT_HOMEPAGE_SECTION_ORDER],
  profile: {
    name: 'Siddharth Sareen',
    role: 'Senior Game Designer · Technical Game Designer',
    location: 'New Delhi, India',
    email: 'siddharthsareengd@gmail.com',
    portrait: {
      src: '/media/sid-portrait.jpg',
      alt: 'A portrait of me in a yellow jacket',
    },
  },
  hero: {
    eyebrow: 'Systems · Prototypes · Shipped Games',
    headline: [
      {text: 'I design '},
      {text: 'playable systems', accent: true},
      {text: ' then prove them in‑engine.'},
    ],
    media: [
      { src: '/media/belly-brawl-reference-hero.png', alt: 'Belly Brawl arena overview' },
      { src: '/media/belly-brawl-01-sumo-dock.jpg', alt: 'Belly Brawl sumo dock encounter' },
      { src: '/media/design-lab-gameplay-placeholder.png', alt: 'Gameplay system prototype in motion' },
      { src: '/media/design-lab-networked-leap-v060-greybox.png', alt: 'Networked leap attack greybox test' },
    ] satisfies MediaItem[],
  },
  carousels: {
    hero: {enabled: true, seconds: 7},
    bellyBrawl: {enabled: true, seconds: 7},
    designLab: {enabled: false, seconds: 7},
  },
  stats: [
    { value: '10+', label: 'Years of Experience' },
    { value: '30M+', label: 'Combined Downloads' },
    { value: '500+', label: 'Levels Designed' },
    { value: 'UE5', label: 'Blueprint Prototyping' },
  ],
  bellyBrawl: {
    slug: 'belly-brawl',
    title: 'Belly Brawl',
    role: 'Game & Level Design Lead · Technical Design',
    summary: 'A multiplayer party brawler built around readable combat, playful arenas, and interacting game systems.',
    support: 'I shaped the combat and level systems through focused prototypes, playtesting, and rapid in‑engine iteration.',
    facts: [],
    media: [
      {
        src: '/media/belly-brawl-01-sumo-dock.jpg',
        alt: 'Belly Brawl fighters facing off on a dock arena',
      },
      {
        src: '/media/belly-brawl-reference-hero.png',
        alt: 'Belly Brawl arena overview during a multiplayer match',
      },
      {
        src: '/media/belly-brawl-concept-placeholder.png',
        alt: 'Belly Brawl characters facing off in a combat arena',
      },
    ],
  },
  approach: [
    { number: '01', title: 'Frame the decision', description: 'Clarify the player problem, constraint, or design question.' },
    { number: '02', title: 'Build the smallest playable proof', description: 'Isolate uncertainty in a focused prototype.' },
    { number: '03', title: 'Observe play', description: 'Watch player behaviour, gather useful evidence, and see what the system actually does.' },
    { number: '04', title: 'Change the system', description: 'Make a deliberate change, then test its effect.' },
  ],
  prototypes: [
    {
      slug: 'networked-leap-attack',
      title: 'Networked Leap Attack',
      tag: {label: 'Prototype', color: 'yellow'},
      tabs: [
        {
          key: 'problem',
          label: 'Problem',
          body: 'How can a committed leap stay readable and responsive for the attacker, target, and nearby players in a networked encounter?',
        },
        {
          key: 'findings',
          label: 'Findings',
          items: [
            'A clear launch pause improves readability without making the attack feel slow.',
            'A visible landing target helps players read risk before impact.',
            'Tuning travel and impact separately makes the move easier to balance.',
          ],
        },
      ],
      media: {
        src: '/media/design-lab-networked-leap-v060-greybox.png',
        alt: 'Networked leap attack trajectory in an Unreal Engine greybox',
      },
      blueprintUrl: 'https://blueprintue.com/render/qm1xocn2/',
    },
    {
      slug: 'combat-readability-test',
      title: 'Combat Readability Test',
      tag: {label: 'Prototype', color: 'yellow'},
      tabs: [
        {
          key: 'problem',
          label: 'Problem',
          body: 'How much anticipation and recovery make a close-range attack readable without making it feel unresponsive?',
        },
        {
          key: 'findings',
          label: 'Findings',
          items: [
            'Silhouette and timing communicate more clearly than extra effects.',
            'Short recovery preserves momentum while leaving a punish window.',
            'Camera framing changes perceived speed as much as the animation curve.',
          ],
        },
      ],
      media: {
        src: '/media/leap-attack-greybox-placeholder.png',
        alt: 'Combat readability prototype in a greybox arena',
      },
    },
    {
      slug: 'arena-pressure-loop',
      title: 'Arena Pressure Loop',
      tag: {label: 'Prototype', color: 'yellow'},
      tabs: [
        {
          key: 'problem',
          label: 'Problem',
          body: 'How can a small arena keep players moving without making the pressure feel arbitrary or unfair?',
        },
        {
          key: 'findings',
          label: 'Findings',
          items: [
            'Simple spatial tells are clearer than persistent warning UI.',
            'Staggered pressure beats create more player-driven collisions.',
            'Safe zones should rotate rather than disappear completely.',
          ],
        },
      ],
      media: {
        src: '/media/design-lab-gameplay-placeholder.png',
        alt: 'Arena pressure loop gameplay prototype',
      },
    },
  ] satisfies Prototype[],
  shippedWork: [
    {
      slug: 'wyb-the-play-social',
      title: 'Wyb / The Play Social',
      role: 'Systems Designer',
      media: { src: '/media/shipped-wyb-cover.png', alt: 'Wyb / The Play Social cover artwork' },
      summary: 'I worked on systems design for Wyb / The Play Social.',
      facts: [],
      detailMedia: [{ src: '/media/shipped-wyb-cover.png', alt: 'Wyb / The Play Social cover artwork', fit: 'cover' }],
      externalLinks: [],
    },
    {
      slug: 'early-learn',
      title: 'Early Learn',
      role: 'Lead Game Designer / Technical Designer',
      media: { src: '/media/shipped-early-learn-cover.jpg', alt: 'Early Learn cover artwork' },
      summary: 'I worked as Lead Game Designer and Technical Designer on Early Learn.',
      facts: [],
      detailMedia: [{ src: '/media/shipped-early-learn-cover.jpg', alt: 'Early Learn cover artwork', fit: 'cover' }],
      externalLinks: [],
    },
    {
      slug: 'kitchen-story',
      title: 'Kitchen Story',
      role: 'Game Designer / Level Designer',
      media: { src: '/media/shipped-kitchen-story-cover.jpg', alt: 'Kitchen Story cover artwork' },
      summary: 'I worked on game and level design for Kitchen Story.',
      facts: [],
      detailMedia: [{ src: '/media/shipped-kitchen-story-cover.jpg', alt: 'Kitchen Story cover artwork', fit: 'cover' }],
      externalLinks: [],
    },
    {
      slug: 'world-of-cricket',
      title: 'World of Cricket',
      role: 'Game Designer',
      media: { src: '/media/shipped-world-of-cricket-cover.jpg', alt: 'World of Cricket cover artwork' },
      summary: 'I worked on game design for World of Cricket.',
      facts: [],
      detailMedia: [{ src: '/media/shipped-world-of-cricket-cover.jpg', alt: 'World of Cricket cover artwork', fit: 'cover' }],
      externalLinks: [],
    },
  ] satisfies ShippedProject[],
  about: {
    bio: 'I design combat, progression and multiplayer systems, then prototype them in-engine to test how they actually play.',
    tags: ['Combat Design', 'Systems Design', 'Multiplayer', 'Rapid Prototyping'],
  },
  contact: {
    message: 'Let’s make something players love.',
    links: [
      { label: 'Email', value: 'siddharthsareengd@gmail.com', href: 'mailto:siddharthsareengd@gmail.com' },
      { label: 'Résumé', value: 'Request résumé', href: '#resume' },
      { label: 'Based in', value: 'New Delhi, India', href: undefined },
    ],
  },
};

export const localHomePagePayload: HomePagePayload = {site, pageCopy, seo};
import type {PrototypeTabContentNode} from './prototype-tab-content';
