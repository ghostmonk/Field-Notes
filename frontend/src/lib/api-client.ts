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
  UpdateProjectRequest
} from '@/types/api';
import { ApiRequestError } from '@/types/error';

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
      console.error('API error:', { 
        status: response.status, 
        request: requestDetails,
        error: apiError
      });
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
    getBySlug: (slug: string) => `/api/projects/${slug}`,
    create: () => '/api/projects',
    update: (id: string) => `/api/projects/${id}`,
    delete: (id: string) => `/api/projects/${id}`,
  },
};

interface PaginationParams {
  limit?: number;
  offset?: number;
  include_drafts?: boolean;
}

interface ProjectPaginationParams {
  limit?: number;
  offset?: number;
  featured_only?: boolean;
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
        params: pagination as Record<string, string | number>
      }),
    
    getById: (id: string, token: string) => 
      fetchApi<Story>(apiRoutes.stories.getById(id), { token }),
    
    create: (data: CreateStoryRequest, token: string) => 
      fetchApi<Story, CreateStoryRequest>(apiRoutes.stories.create(), { 
        method: 'POST', 
        body: data, 
        token 
      }),
    
    update: (id: string, data: Partial<Story>, token: string) => 
      fetchApi<Story, Partial<Story>>(apiRoutes.stories.update(id), { 
        method: 'PUT', 
        body: data, 
        token 
      }),
    
    delete: (id: string, token: string) =>
      fetchApi<Story>(apiRoutes.stories.delete(id), {
        method: 'DELETE',
        token
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

};

export { ApiRequestError, apiClient };
export default apiClient; 