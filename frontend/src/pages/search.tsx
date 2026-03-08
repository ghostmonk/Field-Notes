import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { getSiteConfig } from '@/config';
import { SearchResult } from '@/shared/lib/api-client';

interface SearchPageProps {
  results: SearchResult[];
  query: string;
  total: number;
}

export default function SearchPage({ results, query, total }: SearchPageProps) {
  const config = getSiteConfig();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(query);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const getResultLink = (result: SearchResult) => {
    if (result.content_type === 'page') {
      return `/${result.slug}`;
    }
    if (result.section_slug) {
      return `/${result.section_slug}/${result.slug}`;
    }
    return `/${result.slug}`;
  };

  return (
    <>
      <Head>
        <title>{query ? `Search: ${query}` : 'Search'} | {config.site.title}</title>
      </Head>
      <div className="search-page">
        <form onSubmit={handleSubmit} className="search-page__form" role="search">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="search-bar__input search-bar__input--large"
            aria-label="Search content"
            autoFocus
          />
          <button type="submit" className="btn btn--primary">Search</button>
        </form>

        {query && (
          <p className="search-page__summary">
            {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
        )}

        <div className="search-results">
          {results.map((result) => (
            <Link key={result.id} href={getResultLink(result)} className="search-result">
              <div className="search-result__header">
                <h2 className="search-result__title">{result.title}</h2>
                <span className={`badge badge--${result.content_type}`}>
                  {result.content_type}
                </span>
              </div>
              <p className="search-result__excerpt">{result.excerpt}</p>
            </Link>
          ))}
          {query && results.length === 0 && (
            <p className="search-page__empty">No results found. Try different keywords.</p>
          )}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (!q) {
    return { props: { results: [], query: '', total: 0 } };
  }

  const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!API_BASE_URL) {
    return { props: { results: [], query: q, total: 0 } };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/search?q=${encodeURIComponent(q)}&limit=20`
    );
    if (!response.ok) {
      return { props: { results: [], query: q, total: 0 } };
    }
    const data = await response.json();
    return { props: { results: data.results, query: q, total: data.total } };
  } catch {
    return { props: { results: [], query: q, total: 0 } };
  }
};
