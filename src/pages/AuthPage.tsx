import { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { getCurrentUser } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import './AuthPage.css';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        navigate('/dashboard', { replace: true });
      } catch {
        // Not authenticated, stay on auth page
      }
    };
    void checkAuth();
  }, [navigate]);

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link to="/" className="logo">arche</Link>
      </header>

      <main className="auth-main">
        <div className="auth-container">
          <Authenticator
            initialState={mode === 'signup' ? 'signUp' : 'signIn'}
            formFields={{
              signUp: {
                nickname: {
                  label: 'Username',
                  placeholder: 'your-username',
                  isRequired: true,
                  order: 1,
                },
                email: {
                  order: 2,
                },
                password: {
                  order: 3,
                },
                confirm_password: {
                  order: 4,
                },
              },
              signIn: {
                username: {
                  label: 'Email',
                  placeholder: 'your@email.com',
                },
              },
            }}
            components={{
              Header() {
                return (
                  <div className="auth-form-header">
                    <h2>{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
                    <p>
                      {mode === 'signup'
                        ? 'Start archiving your creative process'
                        : 'Sign in to continue'}
                    </p>
                  </div>
                );
              },
            }}
          >
            {() => {
              // User is authenticated, redirect to dashboard
              navigate('/dashboard', { replace: true });
              return <></>;
            }}
          </Authenticator>
        </div>
      </main>

      <footer className="auth-footer">
        <p>
          <Link to="/">Back to Home</Link>
        </p>
      </footer>
    </div>
  );
}

export default AuthPage;
