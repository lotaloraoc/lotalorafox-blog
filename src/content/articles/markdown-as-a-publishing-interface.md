---
title: "Markdown as a publishing interface"
description: "A durable, low-friction workflow for technical writing that keeps content portable and version controlled."
publishedAt: 2026-05-12
author: "Lota Lora Fox"
tags: ["Writing", "Workflow"]
language: "en"
translationKey: "markdown-as-a-publishing-interface"
featured: true
---

Markdown is a good publishing interface because it keeps the author close to the ideas. There is no dashboard to learn, no proprietary export format, and no database required to preserve the work.

## What an article needs

Each article in this site begins with a small frontmatter block:

```yaml
---
title: "A clear title"
description: "A one-sentence summary"
publishedAt: 2026-06-11
author: "Your name"
tags: ["Architecture", "Tools"]
draft: false
---
```

Below that block, ordinary GitHub-style Markdown works as expected:

- headings and emphasis
- fenced code blocks
- tables and task lists
- blockquotes and links
- images from the `public/` directory
- Mermaid diagrams using a `mermaid` code fence

## Keep content portable

The source files remain useful even if the site framework changes later. That is a quiet but important advantage: the writing is the durable asset, while the presentation layer can evolve around it.

![A simple map from Markdown source to static website](/images/publishing-flow.svg)

The build turns each file into a fast, standalone HTML page. Upload the generated folder to any ordinary static host and the publishing system is complete.
