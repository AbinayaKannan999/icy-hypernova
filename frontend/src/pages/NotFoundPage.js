import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="text-9xl mb-4 leading-none" style={{ color: 'var(--primary-200)', fontWeight: 900 }}>404</div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-lg text-gray-500 max-w-md mx-auto mb-8">
        We couldn't find the page you were looking for. It might have been moved or removed.
      </p>
      <Link to="/" className="btn btn-primary px-8 py-3 text-lg rounded-full shadow-lg shadow-primary-500/30">
        Return to Dashboard
      </Link>
    </div>
  );
};

export default NotFoundPage;
