import React, { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { VideoExtension } from './VideoExtension';
import { ErrorService } from '@/services/errorService';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useImageUpload, useVideoUpload } from '@/hooks/uploads';
import { AltTextDialog } from './AltTextDialog';
import { ImageBubbleMenu } from './ImageBubbleMenu';

interface RichTextEditorProps {
    onChange: (content: string) => void;
    content?: string;
    actionSlot?: React.ReactNode;
}

/**
 * TipTap-based rich text editor with image and video upload support.
 */
export default function RichTextEditor({ onChange, content = "", actionSlot }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                validate: (href: string) => /^https?:\/\//i.test(href),
            }),
            Image.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        width: {
                            default: null,
                            parseHTML: element => element.getAttribute('width'),
                            renderHTML: attributes => attributes.width ? { width: attributes.width } : {},
                        },
                        height: {
                            default: null,
                            parseHTML: element => element.getAttribute('height'),
                            renderHTML: attributes => attributes.height ? { height: attributes.height } : {},
                        },
                        srcset: {
                            default: null,
                            parseHTML: element => element.getAttribute('srcset'),
                            renderHTML: attributes => attributes.srcset ? { srcset: attributes.srcset } : {},
                        },
                        sizes: {
                            default: null,
                            parseHTML: element => element.getAttribute('sizes'),
                            renderHTML: attributes => attributes.sizes ? { sizes: attributes.sizes } : {},
                        },
                    }
                },
            }).configure({
                HTMLAttributes: { class: 'responsive-image' },
                allowBase64: false,
                inline: false,
            }),
            VideoExtension,
        ],
        content: content,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        immediatelyRender: false,
    });

    // Upload hooks
    const { pendingAltText, ...imageUpload } = useImageUpload(editor);
    const videoUpload = useVideoUpload(editor);

    // Link input state
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const linkInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (showLinkInput) linkInputRef.current?.focus();
    }, [showLinkInput]);

    const applyLink = () => {
        if (linkUrl.trim() && editor) {
            editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
        }
        setShowLinkInput(false);
        setLinkUrl('');
    };

    // Sync content from props
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [editor, content]);

    if (!editor) {
        return <div>Loading editor...</div>;
    }

    // Combined upload error from either source
    const uploadError = imageUpload.error || videoUpload.error;
    const clearError = () => {
        imageUpload.clearError();
        videoUpload.clearError();
    };

    return (
        <div className="w-full border rounded dark:border-gray-700 p-2" data-testid="rich-text-editor">
            {uploadError && (
                <div className="mb-4">
                    <ErrorDisplay
                        error={ErrorService.createDisplayError(uploadError)}
                        onDismiss={clearError}
                        showDetails={true}
                    />
                </div>
            )}

            <div className="mb-2 flex flex-wrap gap-2">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    label="Bold"
                    testId="toolbar-bold"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    label="Italic"
                    testId="toolbar-italic"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    label="H1"
                    testId="toolbar-h1"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    label="H2"
                    testId="toolbar-h2"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    label="Bullet List"
                    testId="toolbar-bullet-list"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    label="Ordered List"
                    testId="toolbar-ordered-list"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    label="Blockquote"
                    testId="toolbar-blockquote"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    label="Code"
                    testId="toolbar-code-block"
                />
                <ToolbarButton
                    onClick={() => {
                        if (editor.isActive('link')) {
                            editor.chain().focus().unsetLink().run();
                        } else {
                            setShowLinkInput(true);
                        }
                    }}
                    isActive={editor.isActive('link')}
                    label="Link"
                    testId="toolbar-link"
                />
                <span className="w-px h-6 bg-gray-300 dark:bg-gray-600 self-center" aria-hidden="true" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    label="Undo"
                    testId="toolbar-undo"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    label="Redo"
                    testId="toolbar-redo"
                />
                <span className="w-px h-6 bg-gray-300 dark:bg-gray-600 self-center" aria-hidden="true" />
                <ToolbarButton
                    onClick={imageUpload.triggerFileSelect}
                    label="Image"
                    testId="toolbar-image"
                />
                <ToolbarButton
                    onClick={videoUpload.triggerFileSelect}
                    label="Video"
                    testId="toolbar-video"
                />
                <input
                    type="file"
                    ref={imageUpload.inputRef}
                    className="hidden"
                    accept={imageUpload.acceptTypes}
                    onChange={imageUpload.handleFileChange}
                    data-testid="image-upload-input"
                />
                <input
                    type="file"
                    ref={videoUpload.inputRef}
                    className="hidden"
                    accept={videoUpload.acceptTypes}
                    onChange={videoUpload.handleFileChange}
                    data-testid="video-upload-input"
                />
            </div>
            {showLinkInput && (
                <div className="mb-2 flex items-center gap-2" data-testid="link-input-bar">
                    <input
                        ref={linkInputRef}
                        type="url"
                        value={linkUrl}
                        onChange={e => setLinkUrl(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                            if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); }
                        }}
                        placeholder="https://..."
                        className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white"
                        data-testid="link-url-input"
                    />
                    <button onClick={applyLink} className="btn btn--primary btn--sm" data-testid="link-apply">Apply</button>
                    <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); }} className="btn btn--secondary btn--sm" data-testid="link-cancel">Cancel</button>
                </div>
            )}
            {actionSlot && (
                <div className="mb-2 flex flex-wrap items-center gap-4">
                    {actionSlot}
                </div>
            )}
            <EditorContent editor={editor} className="border p-3 rounded min-h-[400px] dark:bg-gray-800 dark:text-white" data-testid="editor-content" />
            <ImageBubbleMenu editor={editor} />
            {pendingAltText && (
                <AltTextDialog
                    onConfirm={pendingAltText.resolve}
                />
            )}
        </div>
    );
}

/**
 * Toolbar button component to reduce repetition.
 */
function ToolbarButton({ onClick, isActive, label, testId }: {
    onClick: () => void;
    isActive?: boolean;
    label: string;
    testId: string;
}) {
    const baseClass = "px-2 py-1 rounded";
    const activeClass = isActive ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800';

    return (
        <button type="button" onClick={onClick} className={`${baseClass} ${activeClass}`} data-testid={testId}>
            {label}
        </button>
    );
}
