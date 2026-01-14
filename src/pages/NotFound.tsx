import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center px-4">
        <h1 className="mb-2 text-4xl font-bold">404</h1>
        <p className="mb-2 text-xl text-muted-foreground">
          We couldn&apos;t find the page you were looking for.
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          The link may be broken or the page may have been removed.
        </p>
        <Link
          to="/"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
