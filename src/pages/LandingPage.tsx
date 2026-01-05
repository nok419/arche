import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser } from 'aws-amplify/auth';
import './LandingPage.css';

export function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        // User is authenticated, redirect to dashboard
        navigate('/dashboard', { replace: true });
      } catch {
        // User is not authenticated, stay on landing page
      }
    };
    void checkAuth();
  }, [navigate]);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="container">
          <h1 className="logo">arche</h1>
          <nav className="landing-nav">
            <Link to="/gallery" className="nav-link">Gallery</Link>
            <Link to="/auth" className="nav-link nav-link-primary">Sign In</Link>
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h2 className="hero-title">
                Process Archive &<br />
                Portfolio
              </h2>
              <p className="hero-subtitle">
                芸術作品の制作過程をバージョン履歴付きで<br />
                体系的にアーカイブするシステム
              </p>
              <div className="hero-actions">
                <Link to="/auth?mode=signup" className="btn btn-primary">
                  Get Started
                </Link>
                <Link to="/gallery" className="btn btn-secondary">
                  Browse Gallery
                </Link>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-visual-placeholder">
                {/* Landing illustration placeholder */}
                <div className="visual-card visual-card-1"></div>
                <div className="visual-card visual-card-2"></div>
                <div className="visual-card visual-card-3"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <h3 className="features-title">Why arche?</h3>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4>Version Control</h4>
                <p>制作過程の各段階を追跡し、変化を可視化</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4>Multi-format Support</h4>
                <p>画像、動画、音声、テキストを一元管理</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <h4>Flexible Sharing</h4>
                <p>プライベートから公開まで細かくアクセス制御</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h4>Long-term Archive</h4>
                <p>大容量データを低コストで永続保存</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="container">
            <h3>Start archiving your creative process</h3>
            <p>芸術作品の制作過程を、後世に残す</p>
            <Link to="/auth?mode=signup" className="btn btn-primary btn-large">
              Sign Up Free
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2025 llc Niferche. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
