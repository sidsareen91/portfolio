export const HOME_PAGE_QUERY = `{
  "settings": *[_type == "siteSettings" && _id == "siteSettings"][0]{
    name,
    role,
    location,
    email,
    portrait{image, alt},
    linkedinUrl,
    discordUrl,
    resumeLabel,
    "resumeUrl": coalesce(resumeFile.asset->url, resumeUrl),
    siteUrl,
    defaultSeo{title, description, socialImage{image, alt}}
  },
  "page": *[_type == "homePage" && _id == "homePage"][0]{
    sectionOrder,
    hero{
      eyebrow,
      headline,
      autoSwitchItems,
      switchIntervalSeconds,
      media[]{kind, image, "imageAsset": image.asset->{url, mimeType}, videoFile{asset->{url}}, videoUrl, poster, alt, decorative, displayMode, caption}
    },
    stats[]{value, label},
    featuredProjectKicker,
    "featuredProject": featuredProject->{
      title,
      "slug": slug.current,
      projectType,
      role,
      homepageSummary,
      facts,
      contributionSummary,
      galleryAutoSwitchItems,
      gallerySwitchIntervalSeconds,
      primaryMedia{kind, image, "imageAsset": image.asset->{url, mimeType}, videoFile{asset->{url}}, videoUrl, poster, alt, decorative, displayMode, caption},
      galleryMedia[]{kind, image, "imageAsset": image.asset->{url, mimeType}, videoFile{asset->{url}}, videoUrl, poster, alt, decorative, displayMode, caption}
    },
    approach{title, steps[]{title, description}},
    designLabTitle,
    designLabAutoSwitchItems,
    designLabSwitchIntervalSeconds,
    "prototypes": prototypes[]->{
      title,
      "slug": slug.current,
      tagLabel,
      tagColor,
      tabs[]{
        _key,
        label,
        content[]{_key, _type, listItem, level, children[]{_key, _type, text, marks}},
        body,
        items
      },
      primaryMedia{kind, image, "imageAsset": image.asset->{url, mimeType}, videoFile{asset->{url}}, videoUrl, poster, alt, decorative, displayMode, caption},
      blueprintUrl,
      blueprintCtaEnabled,
      blueprintCtaLabel
    },
    shippedWork{
      kicker,
      title,
      "projects": projects[]->{
        title,
        "slug": slug.current,
        projectType,
        role,
        homepageSummary,
        facts,
        contributionSummary,
        googlePlayUrl,
        appStoreUrl,
        officialUrl,
        primaryMedia{kind, image, "imageAsset": image.asset->{url, mimeType}, videoFile{asset->{url}}, videoUrl, poster, alt, decorative, displayMode, caption},
        galleryMedia[]{kind, image, "imageAsset": image.asset->{url, mimeType}, videoFile{asset->{url}}, videoUrl, poster, alt, decorative, displayMode, caption}
      }
    },
    about{kicker, heading, bio, tags, fieldNotesTitle, notes[]{title, description}},
    contact{kicker, headline}
  }
}`
