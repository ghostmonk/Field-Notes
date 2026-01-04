/**
 * Application hooks - re-exports from focused modules.
 */

// Story hooks (now in modules/stories)
export { useFetchStories, useFetchStory, useStoryMutations } from '@/modules/stories/hooks';
export type {
  UseFetchStoriesOptions,
  UseFetchStoriesReturn,
  UseFetchStoryReturn,
  UseStoryMutationsReturn,
  MutationErrorDetails,
} from '@/modules/stories/hooks';

// Upload hooks
export { useFileUpload, useImageUpload, useVideoUpload } from './uploads';
export type {
  UploadResponse,
  UseFileUploadOptions,
  UseFileUploadReturn,
  UseImageUploadReturn,
  UseVideoUploadReturn,
} from './uploads';

// Editor hooks (now in modules/editor)
export { useStoryEditor } from '@/modules/editor/hooks';
export type { UseStoryEditorReturn } from '@/modules/editor/hooks';

// Client-side storage
export { default as useClientSideStorage } from './useClientSideStorage';

// Navigation hooks
export { useActiveSection } from './useActiveSection';
export { useMediaQuery, useIsDesktop, useIsMobile } from './useMediaQuery';
