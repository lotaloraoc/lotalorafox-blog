import rss from '@astrojs/rss';
import { getPublishedArticles } from '../lib/articles';
import { siteConfig } from '../config';

export async function GET(context: { site: URL | undefined }) {
  const articles = await getPublishedArticles('en');

  return rss({
    title: siteConfig.name,
    description: siteConfig.description,
    site: context.site ?? siteConfig.siteUrl,
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.publishedAt,
      link: `/articles/${article.data.translationKey}/`,
      categories: article.data.tags,
    })),
  });
}
