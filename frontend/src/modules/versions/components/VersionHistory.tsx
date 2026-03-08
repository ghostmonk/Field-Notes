import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/shared/lib/api-client';
import { useConfirm } from '@/components/ConfirmDialog';

interface Version {
  version: number;
  title: string;
  created_at: string;
  created_by: string;
}

type ContentType = 'story' | 'project' | 'page';

interface VersionHistoryProps {
  contentType: ContentType;
  contentId: string;
  onSelectVersion?: (version: { title: string; content: string }) => void;
}

export function VersionHistory({ contentType, contentId, onSelectVersion }: VersionHistoryProps) {
  const { data: session } = useSession();
  const confirmDialog = useConfirm();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!session?.accessToken || !contentId) return;
    setLoading(true);
    setError(null);
    apiClient.versions.list(contentType, contentId, session.accessToken as string)
      .then((data) => setVersions(data.versions))
      .catch((err) => {
        setVersions([]);
        setError(err instanceof Error ? err.message : 'Failed to load version history');
      })
      .finally(() => setLoading(false));
  }, [contentType, contentId, session?.accessToken]);

  const handleSelect = async (version: number) => {
    if (!session?.accessToken) return;

    const ok = await confirmDialog({
      title: 'Restore version',
      message: 'Load this version? Current unsaved changes will be lost.',
    });
    if (!ok) return;

    setSelectedVersion(version);
    setError(null);
    setFetching(true);
    try {
      const data = await apiClient.versions.get(contentType, contentId, version, session.accessToken as string);
      onSelectVersion?.({ title: data.title, content: data.content });
    } catch (err) {
      setSelectedVersion(null);
      setError(err instanceof Error ? err.message : 'Failed to load version');
    } finally {
      setFetching(false);
    }
  };

  if (loading) return <p className="version-history__loading">Loading versions...</p>;
  if (error && versions.length === 0) return <p className="version-history__error">{error}</p>;
  if (versions.length === 0) return null;

  return (
    <div className="version-history">
      <h3 className="version-history__title">Version History</h3>
      {error && <p className="version-history__error">{error}</p>}
      <ul className="version-history__list">
        {versions.map((v) => (
          <li key={v.version} className="version-history__item">
            <button
              onClick={() => handleSelect(v.version)}
              disabled={fetching}
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
