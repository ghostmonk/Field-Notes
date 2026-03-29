export interface ListingItem {
    id: string;
    slug: string;
    item_type: 'section' | 'content';
    content_type?: string;
    title: string;
    summary?: string | null;
    image_url?: string | null;
    video_url?: string | null;
    path?: string | null;
    display_type?: string | null;
    tags: string[];
    is_published: boolean;
    is_featured: boolean;
    sort_order?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    user_id?: string | null;
}
