import React from 'react';
import { LoadingAnimation, LoadingAnimationShowcase } from './LoadingAnimations';

/**
 * Skeleton loading components for better perceived performance
 * Now with proper dark mode support and testing capabilities
 */

export const StoryItemSkeleton: React.FC = () => (
  <div className="card animate-pulse" data-testid="story-skeleton">
    {/* Lead media placeholder */}
    <div className="h-48 w-full bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>

    {/* Title */}
    <div className="h-7 w-3/4 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>

    {/* Date + reading time row */}
    <div className="flex items-center gap-2 mb-4">
      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-4 w-1 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>

    {/* Content lines */}
    <div className="space-y-2 mb-4">
      <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>

    {/* Engagement row */}
    <div className="flex items-center gap-3 mb-3">
      <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>

    {/* Read more */}
    <div className="h-8 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
  </div>
);

export const StoriesListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="mt-4">
    <div className="flex flex-col space-y-6">
      {Array.from({ length: count }, (_, index) => (
        <StoryItemSkeleton key={index} />
      ))}
    </div>
  </div>
);

export const EditorSkeleton: React.FC = () => (
  <div className="container mx-auto px-4 py-8 animate-pulse">
    {/* Title input skeleton */}
    <div className="mb-6">
      <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded border dark:border-gray-600"></div>
    </div>
    
    {/* Toolbar skeleton */}
    <div className="mb-4 flex space-x-2">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
      ))}
    </div>
    
    {/* Editor content skeleton */}
    <div className="mb-6 p-4 border dark:border-gray-600 rounded">
      <div className="space-y-3">
        {Array.from({ length: 10 }, (_, index) => (
          <div 
            key={index} 
            className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${
              index % 3 === 0 ? 'w-5/6' : index % 2 === 0 ? 'w-full' : 'w-4/5'
            }`}
          ></div>
        ))}
      </div>
    </div>
    
    {/* Controls skeleton */}
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="flex space-x-2">
        <div className="h-10 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="h-10 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
    </div>
  </div>
);

export const PageLoadingSkeleton: React.FC<{ message?: string }> = ({ 
  message = "Loading..." 
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <LoadingAnimation type="spinnerLarge" size="lg" />
    <p className="text-gray-600 dark:text-gray-400 animate-pulse">{message}</p>
  </div>
);

export const BackendWarmupBanner: React.FC<{ 
  isWarming: boolean; 
  warmupFailed: boolean;
  onRetry?: () => void;
}> = ({ isWarming, warmupFailed, onRetry }) => {
  if (!isWarming && !warmupFailed) return null;

  return (
    <div className={`p-3 mb-4 rounded border ${
      warmupFailed 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' 
        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {isWarming && (
            <div className="mr-3">
              <LoadingAnimation type="wavyDots" />
            </div>
          )}
          <span className="text-sm">
            {isWarming ? 'Starting up services...' : 'Connection failed'}
          </span>
        </div>
        {warmupFailed && onRetry && (
          <button 
            onClick={onRetry}
            className="text-xs underline hover:no-underline opacity-75 hover:opacity-100"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Testing component to preview all loading skeletons
 * Add ?skeleton=test to any URL to see this instead of regular content
 * Example: http://localhost:3000?skeleton=test
 */
export const SkeletonShowcase: React.FC = () => {
  const [showSkeletons, setShowSkeletons] = React.useState(false);

  React.useEffect(() => {
    // Check if we should show skeletons after component mounts
    setShowSkeletons(window.location.search.includes('skeleton=test'));
  }, []);

  if (!showSkeletons) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <div>
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Loading Skeleton Showcase</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Add <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">?skeleton=test</code> to any URL to preview skeletons
        </p>
      </div>

      <section>
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Story Item Skeleton</h3>
        <StoryItemSkeleton />
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Stories List Skeleton</h3>
        <StoriesListSkeleton count={2} />
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Editor Skeleton</h3>
        <div className="border dark:border-gray-600 rounded-lg">
          <EditorSkeleton />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Page Loading Skeleton</h3>
        <div className="border dark:border-gray-600 rounded-lg">
          <PageLoadingSkeleton message="Testing skeleton..." />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Loading Animation Options</h3>
        <div className="mb-6">
          <LoadingAnimationShowcase />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Backend Warmup Banner</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          The real warmup banner is displayed at the top of the page and will stay visible while in skeleton test mode.
          Currently using: <strong>Wavy Dots</strong>
        </p>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ↑ Look at the top of the page for the persistent warmup banner
          </p>
        </div>
      </section>
    </div>
  );
};
