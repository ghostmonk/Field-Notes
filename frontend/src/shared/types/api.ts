/**
 * API type definitions for the Field Notes blog
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
    section_id?: string;
}

/**
 * Page types for static pages
 */
export type PageType = string;

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
    section_id?: string;
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
    section_id?: string;
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
    section_id?: string;
}

/**
 * Request payload for updating a project
 */
export type UpdateProjectRequest = Partial<CreateProjectRequest>;

/**
 * Request payload for creating a new story
 */
export interface CreateStoryRequest {
    title: string;
    content: string;
    is_published: boolean;
    section_id?: string;
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

/**
 * Section types for dynamic routing
 */
export type DisplayType = 'feed' | 'card-grid' | 'static-page' | 'gallery';
export type SectionContentType = 'story' | 'project' | 'page' | 'photo_essay';
export type NavVisibility = 'main' | 'secondary' | 'hidden';

export interface Section {
    id: string;
    title: string;
    slug: string;
    display_type: DisplayType;
    content_type: SectionContentType;
    nav_visibility: NavVisibility;
    sort_order: number;
    is_published: boolean;
    parent_id: string | null;
    icon: string;
    createdDate: string;
    updatedDate: string;
    user_id?: string;
}

/**
 * Represents a photo item within a photo essay
 */
export interface PhotoItem {
    url: string;
    srcset?: string;
    caption?: string;
    width: number;
    height: number;
    sort_order: number;
}

/**
 * Represents a full photo essay with all details
 */
export interface PhotoEssay {
    id: string;
    title: string;
    description?: string;
    cover_image_url: string;
    cover_image_srcset?: string;
    cover_image_position?: string;
    photos: PhotoItem[];
    is_published: boolean;
    section_id?: string;
    user_id?: string;
    createdDate: string;
    updatedDate: string;
}

/**
 * Represents a photo essay card for listings
 */
export interface PhotoEssayCard {
    id: string;
    title: string;
    description?: string;
    cover_image_url: string;
    cover_image_srcset?: string;
    cover_image_position?: string;
    is_published: boolean;
    photo_count: number;
    section_id?: string;
    createdDate: string;
    updatedDate: string;
}

/**
 * Request payload for creating a photo essay
 */
export interface CreatePhotoEssayRequest {
    title: string;
    description?: string;
    cover_image_url: string;
    cover_image_srcset?: string;
    cover_image_position?: string;
    photos: PhotoItem[];
    section_id?: string;
    is_published?: boolean;
}

/**
 * Request payload for updating a photo essay
 */
export interface UpdatePhotoEssayRequest {
    title?: string;
    description?: string;
    cover_image_url?: string;
    cover_image_srcset?: string;
    cover_image_position?: string;
    photos?: PhotoItem[];
    is_published?: boolean;
}

export interface CreateSectionRequest {
    title: string;
    display_type: DisplayType;
    content_type: SectionContentType;
    nav_visibility?: NavVisibility;
    sort_order?: number;
    is_published?: boolean;
    parent_id?: string | null;
    icon?: string;
}

export type UpdateSectionRequest = Partial<CreateSectionRequest>;

/**
 * Engagement types for reactions and comments
 */

export type ReactionTag = 'thumbup' | 'heart' | 'surprise' | 'celebrate' | 'insightful';

export interface Mention {
  user_id: string;
  user_name: string;
}

export interface ReactionCounts {
  counts: Record<string, number>;
  user_reactions: string[];
  details: Record<string, Array<{ user_id: string; user_name: string }>>;
}

export interface ToggleReactionRequest {
  reaction_tag: ReactionTag;
}

export interface ToggleReactionResponse {
  added: boolean;
  reaction_tag: ReactionTag;
}

export interface Comment {
  id: string;
  target_type: string;
  target_id: string;
  parent_id: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  mentions: Mention[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  replies: Comment[];
}

export interface CreateCommentRequest {
  content: string;
  parent_id: string | null;
  mentions: Mention[];
}

export interface CommentsResponse {
  comments: Comment[];
}

export interface BulkCountsRequest {
  targets: Array<{ type: string; id: string }>;
}

export interface BulkCountsResponse {
  counts: Record<string, { reactions: Record<string, number>; comment_count: number }>;
}

/**
 * Resume types
 */
export interface ContactInfo {
  full_name: string;
  title?: string;
  email: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
}

export interface WorkExperience {
  company: string;
  company_url?: string;
  title: string;
  start_date: string;
  end_date?: string;
  current: boolean;
  description: string;
  technologies: string[];
  hide_from_downloads?: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  field_of_study?: string;
  start_date: string;
  end_date?: string;
  description?: string;
}

export interface Resume {
  id: string;
  user_id: string;
  contact: ContactInfo;
  summary: string;
  work_experience: WorkExperience[];
  education: Education[];
  skills: string[];
  achievements: string[];
  createdDate: string;
  updatedDate: string;
}

export interface CreateResumeRequest {
  contact: ContactInfo;
  summary?: string;
  work_experience?: WorkExperience[];
  education?: Education[];
  skills?: string[];
  achievements?: string[];
}

export type UpdateResumeRequest = Partial<CreateResumeRequest>;

export interface TailorRequest {
  job_description: string;
}

export interface TailorEvaluation {
  keyword_coverage: number;
  relevance_ranking: number;
  ats_compatibility: number;
  overall: number;
  issues: string[];
}

export interface TailorAnalysis {
  required_skills: string[];
  preferred_skills: string[];
  seniority: string;
  domain: string;
  culture_signals: string;
  key_requirements: string[];
}

export interface TailorUsage {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
}

export interface TailorResult {
  analysis: TailorAnalysis;
  tailored_resume: Resume;
  evaluation: TailorEvaluation;
  attempts: number;
  usage?: TailorUsage;
}

export type FeedbackType = 'approved' | 'rejected' | 'edited' | 'flagged';

export interface VoiceFeedbackCreate {
  original_text: string;
  final_text?: string;
  feedback_type: FeedbackType;
  job_context: string;
  note?: string;
  section_type?: string;
}

export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'interviewing'
  | 'offered'
  | 'rejected';

export interface JobApplicationCreate {
  company: string;
  job_title: string;
  job_url?: string;
  job_description: string;
  tailored_resume: Resume;
  evaluation_score: TailorEvaluation;
  usage?: TailorUsage;
  status?: ApplicationStatus;
  notes?: string;
}

export interface JobApplicationUpdate {
  status?: ApplicationStatus;
  notes?: string;
  job_url?: string;
}

export interface JobApplicationResponse {
  id: string;
  user_id: string;
  company: string;
  job_title: string;
  job_url?: string;
  job_description: string;
  tailored_resume: Resume;
  evaluation_score: TailorEvaluation;
  usage?: TailorUsage;
  status: ApplicationStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VoiceFeedbackResponse extends VoiceFeedbackCreate {
  id: string;
  user_id: string;
  qdrant_id?: string;
  created_at: string;
}

/**
 * Contact form submission
 */
export interface ContactSubmission {
  name: string;
  email: string;
  message: string;
  turnstile_token: string;
  honeypot: string;
  elapsed_ms: number;
}

export interface ContactResponse {
  status: string;
}