import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import type { Schema } from '../../amplify/data/resource';
import { ShareExpiredPage, ShareNotFoundPage } from './ErrorPages';
import './ShareView.css';

const client = generateClient<Schema>();

type ShareSnapshot = {
  projectId: string;
  fixedVersionId?: string;
  createdBy: string;
  createdAt: string;
  profileSnapshot?: {
    profileVariantId?: string;
    label?: string;
    displayName?: string;
    bio?: string;
    avatarKey?: string;
    links?: Array<{ label: string; url: string }>;
  };
  viewSettings?: {
    showComments?: boolean;
  };
  assets: Array<{
    assetId: string;
    fileType?: string;
    mimeType?: string;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
    cachedKey: string;
  }>;
};

type ShareStatus = 'loading' | 'valid' | 'expired' | 'revoked' | 'notfound';

export function ShareView() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<ShareStatus>('loading');
  const [shareData, setShareData] = useState<ShareSnapshot | null>(null);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      setStatus('notfound');
      return;
    }

    const validateAndLoad = async () => {
      try {
        // Step 1: Validate share link in database
        const { data: shareLinks } = await client.models.ShareLink.list({
          filter: { token: { eq: token } },
          limit: 1,
        });

        const shareLink = shareLinks[0];

        if (!shareLink) {
          setStatus('notfound');
          return;
        }

        // Step 2: Check status
        if (shareLink.status === 'revoked') {
          setStatus('revoked');
          return;
        }

        // Step 3: Check expiration
        if (shareLink.expiresAt) {
          const expiresAt = new Date(shareLink.expiresAt);
          if (expiresAt < new Date()) {
            setStatus('expired');
            return;
          }
        }

        // Step 4: Check if project allows share links
        const { data: project } = await client.models.Project.get({
          id: shareLink.projectId,
        });

        if (!project) {
          setStatus('notfound');
          return;
        }

        if (!project.shareLinkEnabled) {
          setStatus('revoked');
          return;
        }

        // Step 5: Load share.json from S3
        try {
          const { url } = await getUrl({
            path: `public/shares/${token}/metadata/share.json`,
          });
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error('share.json not found');
          }
          const data = (await response.json()) as ShareSnapshot;
          setShareData(data);
          setStatus('valid');

          // Update access count (fire and forget)
          void client.models.ShareLink.update({
            id: shareLink.id,
            accessCount: (shareLink.accessCount ?? 0) + 1,
            lastAccessedAt: new Date().toISOString(),
          });
        } catch {
          setStatus('notfound');
        }
      } catch (error) {
        console.error('Share validation error:', error);
        setStatus('notfound');
      }
    };

    void validateAndLoad();
  }, [token]);

  useEffect(() => {
    const loadAssets = async () => {
      if (!shareData) return;
      const nextUrls: Record<string, string> = {};
      for (const asset of shareData.assets) {
        try {
          const { url } = await getUrl({ path: asset.cachedKey });
          nextUrls[asset.assetId] = url.toString();
        } catch {
          // Asset not available
        }
      }
      setAssetUrls(nextUrls);
    };
    void loadAssets();
  }, [shareData]);

  if (status === 'loading') {
    return (
      <div className="share-page share-loading">
        <div className="loading-spinner"></div>
        <p>Loading share...</p>
      </div>
    );
  }

  if (status === 'notfound') {
    return <ShareNotFoundPage />;
  }

  if (status === 'expired' || status === 'revoked') {
    return <ShareExpiredPage />;
  }

  if (!shareData) {
    return <ShareNotFoundPage />;
  }

  const profile = shareData.profileSnapshot;

  return (
    <div className="share-page">
      <header className="share-header">
        <div className="container">
          <Link to="/" className="logo">arche</Link>
          <span className="header-badge">Shared View</span>
        </div>
      </header>

      <main className="share-main">
        <div className="container">
          {profile && (
            <section className="share-profile">
              {profile.avatarKey && (
                <div className="profile-avatar">
                  {/* Avatar placeholder */}
                </div>
              )}
              <div className="profile-info">
                <h1 className="profile-name">
                  {profile.displayName || 'Anonymous'}
                </h1>
                {profile.bio && (
                  <p className="profile-bio">{profile.bio}</p>
                )}
                {profile.links && profile.links.length > 0 && (
                  <div className="profile-links">
                    {profile.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="profile-link"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="share-assets">
            <div className="assets-header">
              <h2>{shareData.assets.length} Assets</h2>
              <span className="share-date">
                Shared on {new Date(shareData.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="assets-grid">
              {shareData.assets.map((asset) => (
                <div key={asset.assetId} className="asset-card">
                  {assetUrls[asset.assetId] && asset.fileType === 'image' ? (
                    <img
                      src={assetUrls[asset.assetId]}
                      alt={asset.assetId}
                      loading="lazy"
                    />
                  ) : assetUrls[asset.assetId] && asset.fileType === 'video' ? (
                    <video
                      src={assetUrls[asset.assetId]}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <div className="asset-placeholder">
                      <div className="asset-type">{asset.fileType || 'file'}</div>
                      <div className="asset-mime">{asset.mimeType}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="share-footer">
        <div className="container">
          <p>
            Powered by <Link to="/">arche</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default ShareView;
