import React from 'react';
import CubeLoader from './CubeLoader';

export default function GlobalLoader({ onComplete }: { onComplete: () => void }) {
  React.useEffect(() => {
    const timer = window.setTimeout(onComplete, 1800);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return <CubeLoader screen />;
}
