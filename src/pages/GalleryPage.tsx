import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import type { Schema } from '../../amplify/data/resource';
import { useAuth } from '../components/ProtectedRoute';
import './GalleryPage.css';

const client = generateClient<Schema>();

type GalleryProject = Schema['GalleryProject']['type'];
type ViewMode = 'new' | 'saved' | 'following' | 'random' | 'search';

export function GalleryPage() {
  const { auth } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('new');
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      try {
        // For now, load all gallery projects
        // TODO: Implement proper filtering based on viewMode
        const { data } = await client.models.GalleryProject.list({
          limit: 50,
        });

        // Sort by latestActivityAt descending for "new" view
        const sorted = [...data].sort((a, b) => {
          const dateA = a.latestActivityAt || a.createdAt || '';
          const dateB = b.latestActivityAt || b.createdAt || '';
          return dateB.localeCompare(dateA);
        });

        setProjects(sorted);
      } catch (error) {
        console.error('Failed to load gallery projects:', error);
        setProjects([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadProjects();
  }, [viewMode]);

  const loadThumbnail = async (project: GalleryProject) => {
    if (thumbnails[project.id] || !project.thumbnailAssetId) {
      return;
    }
    try {
      // Attempt to load thumbnail from public path
      const { url } = await getUrl({
        path: `public/thumbnails/${project.id}/${project.thumbnailAssetId}`,
      });
      setThumbnails((prev) => ({ ...prev, [project.id]: url.toString() }));
    } catch {
      // Thumbnail not available
    }
  };

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <div className="container">
          <div className="header-left">
            <Link to="/" className="logo">arche</Link>
            <span className="header-divider">/</span>
            <h1>Gallery</h1>
          </div>
          <nav className="header-nav">
            {auth ? (
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
            ) : (
              <Link to="/auth" className="nav-link nav-link-primary">Sign In</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="gallery-main">
        <div className="container">
          <nav className="view-tabs">
            <button
              className={`tab ${viewMode === 'new' ? 'active' : ''}`}
              onClick={() => setViewMode('new')}
            >
              New
            </button>
            {auth && (
              <>
                <button
                  className={`tab ${viewMode === 'saved' ? 'active' : ''}`}
                  onClick={() => setViewMode('saved')}
                >
                  Saved
                </button>
                <button
                  className={`tab ${viewMode === 'following' ? 'active' : ''}`}
                  onClick={() => setViewMode('following')}
                >
                  Following
                </button>
              </>
            )}
            <button
              className={`tab ${viewMode === 'random' ? 'active' : ''}`}
              onClick={() => setViewMode('random')}
            >
              Random
            </button>
            <button
              className={`tab ${viewMode === 'search' ? 'active' : ''}`}
              onClick={() => setViewMode('search')}
            >
              Search
            </button>
          </nav>

          {viewMode === 'search' && (
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          )}

          {isLoading ? (
            <div className="gallery-loading">
              <div className="loading-spinner"></div>
              <p>Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="gallery-empty">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3>No projects found</h3>
              <p>Be the first to share your creative process!</p>
              {!auth && (
                <Link to="/auth?mode=signup" className="btn btn-primary">
                  Get Started
                </Link>
              )}
            </div>
          ) : (
            <div className="project-grid">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="project-card"
                  onMouseEnter={() => loadThumbnail(project)}
                >
                  <div className="card-thumbnail">
                    {thumbnails[project.id] ? (
                      <img src={thumbnails[project.id]} alt={project.projectName} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{project.projectName}</h3>
                    <p className="card-author">
                      {project.publicDisplayName || 'Anonymous'}
                    </p>
                    <div className="card-meta">
                      <span className="card-date">
                        {project.latestActivityAt
                          ? new Date(project.latestActivityAt).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                    {project.stageTags && project.stageTags.length > 0 && (
                      <div className="card-tags">
                        {project.stageTags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="gallery-footer">
        <div className="container">
          <p>&copy; 2025 llc Niferche. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default GalleryPage;
