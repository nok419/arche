import { Link } from 'react-router-dom';
import './ErrorPages.css';

interface ErrorPageProps {
  code: number;
  title: string;
  message: string;
}

function ErrorPage({ code, title, message }: ErrorPageProps) {
  return (
    <div className="error-page">
      <div className="error-content">
        <div className="error-code">{code}</div>
        <h1 className="error-title">{title}</h1>
        <p className="error-message">{message}</p>
        <div className="error-actions">
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage
      code={404}
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
    />
  );
}

export function ForbiddenPage() {
  return (
    <ErrorPage
      code={403}
      title="Access Denied"
      message="You don't have permission to access this resource."
    />
  );
}

export function ServerErrorPage() {
  return (
    <ErrorPage
      code={500}
      title="Server Error"
      message="Something went wrong on our end. Please try again later."
    />
  );
}

export function ShareExpiredPage() {
  return (
    <div className="error-page">
      <div className="error-content">
        <div className="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="error-title">Link Expired</h1>
        <p className="error-message">
          This share link has expired or been revoked.
        </p>
        <div className="error-actions">
          <Link to="/gallery" className="btn btn-primary">
            Browse Gallery
          </Link>
          <Link to="/" className="btn btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ShareNotFoundPage() {
  return (
    <div className="error-page">
      <div className="error-content">
        <div className="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="error-title">Share Link Not Found</h1>
        <p className="error-message">
          This share link doesn't exist. Please check the URL.
        </p>
        <div className="error-actions">
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
