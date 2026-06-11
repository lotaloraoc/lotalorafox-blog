---
title: "Markdown como interfaz de publicación"
description: "Un flujo duradero y de baja fricción para escritura técnica que mantiene el contenido portable y bajo control de versiones."
publishedAt: 2026-05-12
author: "Lota Lora Fox"
tags: ["Escritura", "Flujo de trabajo"]
language: "es"
translationKey: "markdown-as-a-publishing-interface"
featured: true
---

Markdown es una buena interfaz de publicación porque mantiene a quien escribe cerca de las ideas. No hay un panel que aprender, un formato propietario que exportar ni una base de datos necesaria para preservar el trabajo.

## Lo que necesita un artículo

Cada artículo de este sitio comienza con un bloque pequeño de frontmatter:

```yaml
---
title: "Un título claro"
description: "Un resumen de una frase"
publishedAt: 2026-06-11
author: "Tu nombre"
tags: ["Arquitectura", "Herramientas"]
language: "es"
translationKey: "un-identificador-compartido"
draft: false
---
```

Debajo de ese bloque funciona Markdown al estilo de GitHub:

- encabezados y énfasis
- bloques de código cercados
- tablas y listas de tareas
- citas y enlaces
- imágenes desde el directorio `public/`
- diagramas Mermaid mediante un bloque de código `mermaid`

## Mantén el contenido portable

Los archivos fuente siguen siendo útiles incluso si el framework cambia más adelante. Esa es una ventaja silenciosa pero importante: el contenido escrito es el activo duradero, mientras que la capa de presentación puede evolucionar a su alrededor.

![Un mapa sencillo desde el archivo Markdown hasta el sitio estático](/images/publishing-flow.svg)

La compilación convierte cada archivo en una página HTML rápida e independiente. Sube la carpeta generada a cualquier hosting estático y el sistema de publicación estará completo.
