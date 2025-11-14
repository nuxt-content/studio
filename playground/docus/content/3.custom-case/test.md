---
title: Test
description: Test
navigation:
  icon: i-lucide-test
---

This test file is corresponding to a custom case collection:

```[content.config.ts]
pages: defineCollection({
    type: 'page',
    source: {
      include: '3.custom-case/**/*.md',
      prefix: '/',
    },
  }),
```
