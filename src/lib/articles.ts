import { getCollection, type CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'articles'>;
export type Language = 'en' | 'es';

export async function getPublishedArticles(language: Language = 'en') {
  const articles = await getCollection(
    'articles',
    ({ data }) => !data.draft && data.language === language,
  );

  return articles.sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );
}

export function formatDate(date: Date, language: Language = 'en') {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-CO' : 'en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

export function getArticlePath(article: Article) {
  return article.data.language === 'es'
    ? `/es/articulos/${article.data.translationKey}/`
    : `/articles/${article.data.translationKey}/`;
}
