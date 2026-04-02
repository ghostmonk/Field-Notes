/**
 * API Client for making requests to the backend
 */

import {
  Story,
  CreateStoryRequest,
  PaginatedResponse,
  Page,
  PageType,
  UpdatePageRequest,
  ProjectCard,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  Section,
  CreateSectionRequest,
  UpdateSectionRequest,
  ReactionCounts,
  ToggleReactionRequest,
  ToggleReactionResponse,
  CommentsResponse,
  CreateCommentRequest,
  Comment,
  BulkCountsRequest,
  BulkCountsResponse,
  PhotoEssay,
  PhotoEssayCard,
  CreatePhotoEssayRequest,
  UpdatePhotoEssayRequest,
  Resume,
  CreateResumeRequest,
  UpdateResumeRequest,
  TailorRequest,
  TailorResult,
  VoiceFeedbackCreate,
  VoiceFeedbackResponse,
  JobApplicationCreate,
  JobApplicationResponse,
  JobApplicationUpdate,
  ContactSubmission,
  ContactResponse,
  Tag,
  CreateTagRequest,
  TaggedContentResponse,
  AssetListResponse,
} from '@/shared/types/api';
import { ApiRequestError } from '@/shared/types/error';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions<T = unknown> {
  method?: HttpMethod;
  token?: string;
  body?: T;
  params?: Record<string, string | number>;
}

/**
 * Core fetch function with error handling
 */
async function fetchApi<T, B = unknown>(
  endpoint: string,
  { method = 'GET', token, body, params }: RequestOptions<B> = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let url = endpoint;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url = `${endpoint}?${queryString}`;
    }
  }

  const config: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  const requestDetails = {
    url,
    method,
    hasToken: !!token,
    bodyPreview: body ? JSON.stringify(body).substring(0, 100) + (JSON.stringify(body).length > 100 ? '...' : '') : undefined
  };

  console.log(`${method} request to: ${url}`, requestDetails);

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return {} as T;
    }
    
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new ApiRequestError(
        `Invalid response format: ${response.headers.get('content-type')}`,
        response.status,
        undefined,
        requestDetails
      );
    }

    const data = await response.json();

    if (!response.ok) {
      const apiError = new ApiRequestError(
        data?.user_message || data?.detail || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data,
        requestDetails
      );
      // Don't log 404s - they're often expected (e.g., checking if a resource exists)
      if (response.status !== 404) {
        console.error('API error:', {
          status: response.status,
          request: requestDetails,
          error: apiError
        });
      }
      throw apiError;
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    console.error('Network error:', error, {
      request: requestDetails,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw new ApiRequestError(
      error instanceof Error ? error.message : 'Unknown network error',
      0,
      undefined,
      requestDetails
    );
  }
}

/**
 * API endpoints that go through Next.js API routes
 */
const apiRoutes = {
  stories: {
    list: () => '/api/stories',
    getById: (id: string) => `/api/stories/${id}`,
    create: () => '/api/stories',
    update: (id: string) => `/api/stories/${id}`,
    delete: (id: string) => `/api/stories/${id}`,
  },
  pages: {
    get: (pageType: PageType) => `/api/pages/${pageType}`,
    update: (pageType: PageType) => `/api/pages/${pageType}`,
    delete: (pageType: PageType) => `/api/pages/${pageType}`,
  },
  projects: {
    list: () => '/api/projects',
    getById: (id: string) => `/api/projects/${id}`,
    getBySlug: (slug: string) => `/api/projects/${slug}`,
    create: () => '/api/projects',
    update: (id: string) => `/api/projects/${id}`,
    delete: (id: string) => `/api/projects/${id}`,
  },
  sections: {
    list: () => '/api/sections',
    getById: (id: string) => `/api/sections/${id}`,
    getBySlug: (slug: string) => `/api/sections/by-slug/${slug}`,
    navigation: () => '/api/sections/navigation',
    create: () => '/api/sections',
    update: (id: string) => `/api/sections/${id}`,
    delete: (id: string) => `/api/sections/${id}`,
  },
  engagement: {
    reactions: (targetType: string, targetId: string) =>
      `/api/engagement/${targetType}/${targetId}/reactions`,
    comments: (targetType: string, targetId: string) =>
      `/api/engagement/${targetType}/${targetId}/comments`,
    deleteComment: (commentId: string) =>
      `/api/engagement/comments/${commentId}`,
    bulkCounts: () => '/api/engagement/bulk/counts',
  },
  search: {
    query: () => '/api/search',
  },
  versions: {
    list: (contentType: string, contentId: string) =>
      `/api/versions/${contentType}/${contentId}`,
    get: (contentType: string, contentId: string, version: number) =>
      `/api/versions/${contentType}/${contentId}/${version}`,
  },
  photoEssays: {
    list: () => '/api/photo-essays',
    getById: (id: string) => `/api/photo-essays/${id}`,
    create: () => '/api/photo-essays',
    update: (id: string) => `/api/photo-essays/${id}`,
    delete: (id: string) => `/api/photo-essays/${id}`,
  },
  resume: {
    base: () => '/api/resume',
    public: () => '/api/resume/public',
    setDefault: () => '/api/resume/set-default',
    restoreOriginal: () => '/api/resume/restore-original',
  },
  tailor: {
    run: () => '/api/tailor',
  },
  voiceFeedback: {
    base: () => '/api/voice/feedback',
    byId: (id: string) => `/api/voice/feedback/${id}`,
  },
  applications: {
    base: () => '/api/applications',
    byId: (id: string) => `/api/applications/${id}`,
  },
  contact: {
    submit: () => '/api/contact',
  },
  tags: {
    list: () => '/api/tags',
    create: () => '/api/tags',
    delete: (id: string) => `/api/tags/${id}`,
    content: (tagName: string) => `/api/tags/${encodeURIComponent(tagName)}/content`,
  },
  assets: {
    bySection: (sectionId: string) => `/api/assets/by-section/${sectionId}`,
  },
};

export interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  content_type: 'story' | 'project' | 'page';
  slug: string;
  section_slug: string | null;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
}

export interface ContentVersion {
  version: number;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
}

export interface VersionListResponse {
  versions: ContentVersion[];
  total: number;
}

interface PaginationParams {
  limit?: number;
  offset?: number;
  include_drafts?: boolean;
  section_id?: string;
}

interface ProjectPaginationParams {
  limit?: number;
  offset?: number;
  featured_only?: boolean;
  section_id?: string;
}

/**
 * Public API client object
 */
const apiClient = {
  /**
   * Generic request method
   */
  request: fetchApi,

  /**
   * Story methods
   */
  stories: {
    list: (token?: string, pagination?: PaginationParams) =>
      fetchApi<PaginatedResponse<Story>>(apiRoutes.stories.list(), {
        token,
        params: pagination as Record<string, string | number>,
      }),

    getById: (id: string, token: string) =>
      fetchApi<Story>(apiRoutes.stories.getById(id), { token }),

    create: (data: CreateStoryRequest, token: string) =>
      fetchApi<Story, CreateStoryRequest>(apiRoutes.stories.create(), {
        method: 'POST',
        body: data,
        token,
      }),

    update: (id: string, data: Partial<Story>, token: string) =>
      fetchApi<Story, Partial<Story>>(apiRoutes.stories.update(id), {
        method: 'PUT',
        body: data,
        token,
      }),

    delete: (id: string, token: string) =>
      fetchApi<Story>(apiRoutes.stories.delete(id), {
        method: 'DELETE',
        token,
      }),
  },

  /**
   * Page methods
   */
  pages: {
    get: (pageType: PageType) =>
      fetchApi<Page>(apiRoutes.pages.get(pageType)),

    update: (pageType: PageType, data: UpdatePageRequest, token: string) =>
      fetchApi<Page, UpdatePageRequest>(apiRoutes.pages.update(pageType), {
        method: 'PUT',
        body: data,
        token
      }),

    delete: (pageType: PageType, token: string) =>
      fetchApi<void>(apiRoutes.pages.delete(pageType), {
        method: 'DELETE',
        token
      }),
  },

  /**
   * Project methods
   */
  projects: {
    list: (pagination?: ProjectPaginationParams) =>
      fetchApi<PaginatedResponse<ProjectCard>>(apiRoutes.projects.list(), {
        params: pagination as Record<string, string | number>
      }),

    getById: (id: string, token: string) =>
      fetchApi<Project>(apiRoutes.projects.getById(id), { token }),

    getBySlug: (slug: string) =>
      fetchApi<Project>(apiRoutes.projects.getBySlug(slug)),

    create: (data: CreateProjectRequest, token: string) =>
      fetchApi<Project, CreateProjectRequest>(apiRoutes.projects.create(), {
        method: 'POST',
        body: data,
        token
      }),

    update: (id: string, data: UpdateProjectRequest, token: string) =>
      fetchApi<Project, UpdateProjectRequest>(apiRoutes.projects.update(id), {
        method: 'PUT',
        body: data,
        token
      }),

    delete: (id: string, token: string) =>
      fetchApi<void>(apiRoutes.projects.delete(id), {
        method: 'DELETE',
        token
      }),
  },

  /**
   * Section methods
   */
  sections: {
    list: (token?: string, params?: Record<string, string | number>) =>
      fetchApi<PaginatedResponse<Section>>(apiRoutes.sections.list(), { token, params }),

    getById: (id: string, token?: string) =>
      fetchApi<Section>(apiRoutes.sections.getById(id), { token }),

    getBySlug: (slug: string) =>
      fetchApi<Section>(apiRoutes.sections.getBySlug(slug)),

    navigation: () =>
      fetchApi<PaginatedResponse<Section>>(apiRoutes.sections.navigation()),

    create: (data: CreateSectionRequest, token: string) =>
      fetchApi<Section, CreateSectionRequest>(apiRoutes.sections.create(), {
        method: 'POST',
        body: data,
        token,
      }),

    update: (id: string, data: UpdateSectionRequest, token: string) =>
      fetchApi<Section, UpdateSectionRequest>(apiRoutes.sections.update(id), {
        method: 'PUT',
        body: data,
        token,
      }),

    delete: (id: string, token: string) =>
      fetchApi<void>(apiRoutes.sections.delete(id), {
        method: 'DELETE',
        token,
      }),
  },

  /**
   * Engagement methods (reactions and comments)
   */
  engagement: {
    getReactions: (targetType: string, targetId: string, token?: string) =>
      fetchApi<ReactionCounts>(apiRoutes.engagement.reactions(targetType, targetId), { token }),

    toggleReaction: (targetType: string, targetId: string, data: ToggleReactionRequest, token: string) =>
      fetchApi<ToggleReactionResponse, ToggleReactionRequest>(
        apiRoutes.engagement.reactions(targetType, targetId),
        { method: 'POST', body: data, token }
      ),

    getComments: (targetType: string, targetId: string) =>
      fetchApi<CommentsResponse>(apiRoutes.engagement.comments(targetType, targetId)),

    createComment: (targetType: string, targetId: string, data: CreateCommentRequest, token: string) =>
      fetchApi<Comment, CreateCommentRequest>(
        apiRoutes.engagement.comments(targetType, targetId),
        { method: 'POST', body: data, token }
      ),

    deleteComment: (commentId: string, token: string) =>
      fetchApi<void>(apiRoutes.engagement.deleteComment(commentId), {
        method: 'DELETE',
        token
      }),

    getBulkCounts: (data: BulkCountsRequest) =>
      fetchApi<BulkCountsResponse, BulkCountsRequest>(
        apiRoutes.engagement.bulkCounts(),
        { method: 'POST', body: data }
      ),
  },

  /**
   * Search methods
   */
  search: {
    query: (q: string, limit = 20) =>
      fetchApi<SearchResponse>(apiRoutes.search.query(), {
        params: { q, limit },
      }),
  },

  /**
   * Version history methods
   */
  versions: {
    list: (contentType: string, contentId: string, token: string) =>
      fetchApi<VersionListResponse>(apiRoutes.versions.list(contentType, contentId), { token }),

    get: (contentType: string, contentId: string, version: number, token: string) =>
      fetchApi<ContentVersion>(apiRoutes.versions.get(contentType, contentId, version), { token }),
  },

  /**
   * Photo essay methods
   */
  photoEssays: {
    list: (params?: Record<string, string | number>) =>
      fetchApi<PaginatedResponse<PhotoEssayCard>>(apiRoutes.photoEssays.list(), { params }),

    getById: (id: string) =>
      fetchApi<PhotoEssay>(apiRoutes.photoEssays.getById(id)),

    create: (data: CreatePhotoEssayRequest, token: string) =>
      fetchApi<PhotoEssay, CreatePhotoEssayRequest>(apiRoutes.photoEssays.create(), {
        method: 'POST',
        body: data,
        token,
      }),

    update: (id: string, data: UpdatePhotoEssayRequest, token: string) =>
      fetchApi<PhotoEssay, UpdatePhotoEssayRequest>(apiRoutes.photoEssays.update(id), {
        method: 'PUT',
        body: data,
        token,
      }),

    delete: (id: string, token: string) =>
      fetchApi<void>(apiRoutes.photoEssays.delete(id), {
        method: 'DELETE',
        token,
      }),
  },

  /**
   * Resume methods
   */
  resume: {
    get: (token: string) =>
      fetchApi<Resume>(apiRoutes.resume.base(), { token }),

    create: (data: CreateResumeRequest, token: string) =>
      fetchApi<Resume, CreateResumeRequest>(apiRoutes.resume.base(), {
        method: 'POST',
        body: data,
        token,
      }),

    update: (data: UpdateResumeRequest, token: string) =>
      fetchApi<Resume, UpdateResumeRequest>(apiRoutes.resume.base(), {
        method: 'PUT',
        body: data,
        token,
      }),

    delete: (token: string) =>
      fetchApi<void>(apiRoutes.resume.base(), {
        method: 'DELETE',
        token,
      }),

    setDefault: (data: UpdateResumeRequest, token: string) =>
      fetchApi<Resume, UpdateResumeRequest>(apiRoutes.resume.setDefault(), {
        method: 'POST',
        body: data,
        token,
      }),

    restoreOriginal: (token: string) =>
      fetchApi<Resume>(apiRoutes.resume.restoreOriginal(), {
        method: 'POST',
        token,
      }),
  },

  tailor: {
    run: (data: TailorRequest, token: string) =>
      fetchApi<TailorResult, TailorRequest>(apiRoutes.tailor.run(), {
        method: 'POST',
        body: data,
        token,
      }),
  },

  voiceFeedback: {
    submit: (data: VoiceFeedbackCreate, token: string) =>
      fetchApi<VoiceFeedbackResponse, VoiceFeedbackCreate>(
        apiRoutes.voiceFeedback.base(),
        {
          method: 'POST',
          body: data,
          token,
        }
      ),

    list: (token: string, feedbackType?: string) =>
      fetchApi<VoiceFeedbackResponse[]>(apiRoutes.voiceFeedback.base(), {
        token,
        params: feedbackType ? { feedback_type: feedbackType } : undefined,
      }),

    reclassify: (id: string, feedbackType: string, token: string) =>
      fetchApi<VoiceFeedbackResponse>(apiRoutes.voiceFeedback.byId(id), {
        method: 'PUT',
        token,
        params: { feedback_type: feedbackType },
      }),

    delete: (id: string, token: string) =>
      fetchApi<void>(apiRoutes.voiceFeedback.byId(id), {
        method: 'DELETE',
        token,
      }),
  },

  applications: {
    create: (data: JobApplicationCreate, token: string) =>
      fetchApi<JobApplicationResponse, JobApplicationCreate>(
        apiRoutes.applications.base(),
        { method: 'POST', body: data, token }
      ),

    list: (token: string, status?: string) =>
      fetchApi<JobApplicationResponse[]>(apiRoutes.applications.base(), {
        token,
        params: status ? { status } : undefined,
      }),

    update: (id: string, data: JobApplicationUpdate, token: string) =>
      fetchApi<JobApplicationResponse, JobApplicationUpdate>(
        apiRoutes.applications.byId(id),
        { method: 'PUT', body: data, token }
      ),

    delete: (id: string, token: string) =>
      fetchApi<void>(apiRoutes.applications.byId(id), {
        method: 'DELETE',
        token,
      }),
  },

  contact: {
    submit: (data: ContactSubmission) =>
      fetchApi<ContactResponse, ContactSubmission>(apiRoutes.contact.submit(), {
        method: 'POST',
        body: data,
      }),
  },

  tags: {
    search: (q: string, limit = 20) =>
      fetchApi<PaginatedResponse<Tag>>(apiRoutes.tags.list(), {
        params: { q, limit },
      }),

    create: (data: CreateTagRequest, token: string) =>
      fetchApi<Tag, CreateTagRequest>(apiRoutes.tags.create(), {
        method: 'POST',
        body: data,
        token,
      }),

    delete: (id: string, token: string) =>
      fetchApi<void>(apiRoutes.tags.delete(id), {
        method: 'DELETE',
        token,
      }),

    getContent: (tagName: string) =>
      fetchApi<TaggedContentResponse>(apiRoutes.tags.content(tagName)),
  },

  assets: {
    bySection: (sectionId: string, token: string, params?: { limit?: number; cursor?: string }) =>
      fetchApi<AssetListResponse>(apiRoutes.assets.bySection(sectionId), {
        token,
        params: params as Record<string, string | number>,
      }),
  },
};

export { apiClient };
export default apiClient;