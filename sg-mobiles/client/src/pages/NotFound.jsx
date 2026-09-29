import { Link } from 'react-router-dom';
import { useTitle } from '../components/lib';

export default function NotFound() {
  useTitle('Page Not Found');
  return (
    <div className="nf">
      <h1>404</h1>
      <h2>Page not found</h2>
      <p className="muted">The page you are looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn">Back to Home</Link>
    </div>
  );
}
