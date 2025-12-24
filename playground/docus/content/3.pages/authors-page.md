---
title: Authors page
description: Page file corresponding to a custom case collection with an empty prefix different from the include path.
navigation:
  icon: i-lucide-test
---

## Authors page

Page file corresponding to a custom case collection with an empty prefix different from the include path.

```[content.config.ts]
pages: defineCollection({
    type: 'page',
    source: {
      include: '3.pages/**/*.md',
      prefix: '/',
    },
  }),
```

## Authors list

Fetch from data collection

```[content.config.ts]
authors: defineCollection({
    type: 'data',
    source: {
      include: 'authors/**/*',
    },
    schema: createAuthorsSchema(),
  }),
```
