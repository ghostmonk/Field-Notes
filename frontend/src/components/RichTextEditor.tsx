import React, { useEffect } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { VideoExtension } from './VideoExtension';
import { ErrorService } from '@/services/errorService';
import { ErrorDisplay } from './ErrorDisplay';
import { useImageUpload, useVideoUpload } from '@/hooks/uploads';

interface RichTextEditorProps {
    onChange: (content: string) => void;
    content?: string;
}

/**
 * TipTap-based rich text editor with image and video upload support.
 */
export default function RichTextEditor({ onChange, content = "" }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
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
    const imageUpload = useImageUpload(editor);
    const videoUpload = useVideoUpload(editor);

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
            <EditorContent editor={editor} className="border p-3 rounded min-h-[400px] dark:bg-gray-800 dark:text-white" data-testid="editor-content" />
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
