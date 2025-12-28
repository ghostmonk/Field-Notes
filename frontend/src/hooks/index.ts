/**
 * Application hooks - re-exports from focused modules.
 */

// Story hooks
export { useFetchStories, useFetchStory, useStoryMutations } from './stories';
export type {
  UseFetchStoriesOptions,
  UseFetchStoriesReturn,
  UseFetchStoryReturn,
  UseStoryMutationsReturn,
  MutationErrorDetails,
} from './stories';

// Upload hooks
export { useFileUpload, useImageUpload, useVideoUpload } from './uploads';
export type {
  UploadResponse,
  UseFileUploadOptions,
  UseFileUploadReturn,
  UseImageUploadReturn,
  UseVideoUploadReturn,
} from './uploads';

// Editor hooks
export { useStoryEditor } from './editor';
export type { UseStoryEditorReturn } from './editor';

// Client-side storage
export { default as useClientSideStorage } from './useClientSideStorage';

// Navigation hooks
export { useActiveSection } from './useActiveSection';
export { useMediaQuery, useIsDesktop, useIsMobile } from './useMediaQuery';
