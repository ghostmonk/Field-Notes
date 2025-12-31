/**
 * API type definitions for the Turbulence blog
 */

/**
 * User role type
 */
export type UserRole = 'admin' | 'commenter';

/**
 * Represents a user
 */
export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    role: UserRole;
}

/**
 * Represents a story
 */
export interface Story {
    id: string;
    title: string;
    content: string;
    is_published: boolean;
    slug: string;
    date: string;
    createdDate: string;
    updatedDate: string;
    user_id?: string;
}

/**
 * Page types for static pages
 */
export type PageType = 'about' | 'contact';

/**
 * Represents a static page (About, Contact)
 */
export interface Page {
    id: string;
    title: string;
    content: string;
    page_type: PageType;
    is_published: boolean;
    createdDate: string;
    updatedDate: string;
    user_id?: string;
}

/**
 * Request payload for updating a page
 */
export interface UpdatePageRequest {
    title?: string;
    content?: string;
    is_published?: boolean;
}

/**
 * Represents a project card for listings
 */
export interface ProjectCard {
    id: string;
    title: string;
    slug: string;
    summary: string;
    technologies: string[];
    image_url: string | null;
    github_url: string | null;
    live_url: string | null;
    is_featured: boolean;
    user_id?: string;
}

/**
 * Represents a full project with all details
 */
export interface Project {
    id: string;
    title: string;
    slug: string;
    summary: string;
    content: string;
    technologies: string[];
    github_url: string | null;
    live_url: string | null;
    image_url: string | null;
    is_published: boolean;
    is_featured: boolean;
    sort_order: number;
    createdDate: string;
    updatedDate: string;
    user_id?: string;
}

/**
 * Request payload for creating a project
 */
export interface CreateProjectRequest {
    title: string;
    summary: string;
    content: string;
    technologies?: string[];
    github_url?: string;
    live_url?: string;
    image_url?: string;
    is_published?: boolean;
    is_featured?: boolean;
    sort_order?: number;
}

/**
 * Request payload for updating a project
 */
export type UpdateProjectRequest = Partial<CreateProjectRequest>;

/**
 * API error response
 */
export interface ApiError {
    detail: string;
    status?: number;
    error?: string;
}

/**
 * Request payload for creating a new story
 */
export interface CreateStoryRequest {
    title: string;
    content: string;
    is_published: boolean;
}

/**
 * Request payload for updating an existing story
 */
export type UpdateStoryRequest = Partial<CreateStoryRequest>;

/**
 * Generic pagination response wrapper
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
} 