import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/shared/lib/api-client';

interface Version {
  version: number;
  title: string;
  created_at: string;
  created_by: string;
}

interface VersionHistoryProps {
  contentType: string;
  contentId: string;
  onSelectVersion?: (version: { title: string; content: string }) => void;
}

export function VersionHistory({ contentType, contentId, onSelectVersion }: VersionHistoryProps) {
  const { data: session } = useSession();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.accessToken || !contentId) return;
    setLoading(true);
    apiClient.versions.list(contentType, contentId, session.accessToken as string)
      .then((data) => setVersions(data.versions))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [contentType, contentId, session?.accessToken]);

  const handleSelect = async (version: number) => {
    if (!session?.accessToken) return;
    setSelectedVersion(version);
    const data = await apiClient.versions.get(contentType, contentId, version, session.accessToken as string);
    onSelectVersion?.({ title: data.title, content: data.content });
  };

  if (loading) return <p className="version-history__loading">Loading versions...</p>;
  if (versions.length === 0) return null;

  return (
    <div className="version-history">
      <h3 className="version-history__title">Version History</h3>
      <ul className="version-history__list">
        {versions.map((v) => (
          <li key={v.version} className="version-history__item">
            <button
              onClick={() => handleSelect(v.version)}
              className={`version-history__btn ${selectedVersion === v.version ? 'version-history__btn--active' : ''}`}
            >
              <span className="version-history__version">v{v.version}</span>
              <span className="version-history__date">
                {new Date(v.created_at).toLocaleDateString()}
              </span>
              <span className="version-history__label">{v.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
