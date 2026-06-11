import rss from '@astrojs/rss';
import { getPublishedArticles } from '../../lib/articles';
import { siteConfig } from '../../config';

export async function GET(context: { site: URL | undefined }) {
  const articles = await getPublishedArticles('es');

  return rss({
    title: `${siteConfig.name} — Español`,
    description: 'Notas sobre ingeniería de software, diseño de sistemas y herramientas.',
    site: context.site ?? siteConfig.siteUrl,
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.publishedAt,
      link: `/es/articulos/${article.data.translationKey}/`,
      categories: article.data.tags,
    })),
  });
}
