---
title: "The smallest useful development loop"
description: "Why fast feedback is less about raw tooling speed and more about reducing uncertainty between an idea and its result."
publishedAt: 2026-05-28
author: "Lota Lora Fox"
tags: ["Developer experience", "Tooling"]
language: "en"
translationKey: "the-smallest-useful-development-loop"
featured: true
---

A productive development loop answers one question quickly: **did the change do what I intended?**

The loop becomes slow when each step introduces unrelated decisions. Starting five services, finding the right test command, preparing data, and reconstructing hidden state all delay the useful feedback.

## A simple loop

1. State the behavior you want.
2. Make the smallest change that could create it.
3. Observe the result through a test or the interface.
4. Keep or revise the change.

```mermaid
flowchart LR
    I[Intent] --> C[Change]
    C --> O[Observation]
    O --> D{Correct?}
    D -->|Yes| S[Ship]
    D -->|No| I
```

## Optimize for understanding

Milliseconds matter in frequently repeated operations, but clarity usually matters first. A test suite that starts in two seconds and gives an ambiguous failure can cost more attention than one that starts in five seconds and points directly at the broken contract.

Measure the whole path from question to confidence. That is the development loop worth improving.
