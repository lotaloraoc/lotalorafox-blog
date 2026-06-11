# Lota Lora Fox blog

A static development blog built with Astro. Articles are ordinary Markdown files with typed frontmatter, GitHub-flavored Markdown, syntax highlighting, images, and Mermaid diagrams.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:4321`.

## Publish an article

1. Duplicate a file in `src/content/articles/`.
2. Rename it with the URL slug you want, for example `understanding-event-loops.md`.
3. Update the frontmatter and write the article with standard Markdown. English articles use `language: "en"`.
4. Put static images in `public/images/` and reference them as `/images/file-name.png`.
5. Run `npm run build` before publishing.

Use a Mermaid diagram like this:

````markdown
```mermaid
flowchart LR
    A[Idea] --> B[Build]
    B --> C[Publish]
```
````

Set `draft: true` to keep an article out of production builds.

## Add a Spanish translation

Create the translated Markdown file under `src/content/articles/es/`. Give both language versions the same `translationKey`, and set the Spanish file to `language: "es"`. The site generates `/articles/...` and `/es/articulos/...` routes and links both versions through the language selector.

## Personalize the site

Edit `src/config.ts` for the author name, description, location, GitHub profile, and production URL. Replace the homepage introduction in `src/pages/index.astro` with your final biography.

Also set the real production URL in `astro.config.mjs`. This is used for canonical links, RSS, and social metadata.

## Deploy to Hostinger

```bash
npm run build
```

Upload the **contents** of `dist/` into `domains/lotalorafox.com/public_html/` using Hostinger File Manager or FTP. No Node.js server or database is required.

## Automatic FTP deployment

The workflow in `.github/workflows/deploy.yml` builds and deploys on every push or merged pull request to `main`. It requires these repository secrets:

- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
