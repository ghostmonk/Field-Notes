import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { VideoExtension } from './VideoExtension';
import { ErrorService } from '@/services/errorService';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useImageUpload, useVideoUpload, FILTER_CANCEL } from '@/hooks/uploads';
import { AltTextDialog } from './AltTextDialog';
import { ImageFilterPicker } from './ImageFilterPicker';
import { ImageBubbleMenu } from './ImageBubbleMenu';

interface RichTextEditorProps {
    onChange: (content: string) => void;
    content?: string;
    actionSlot?: React.ReactNode;
    sectionId?: string;
}

/**
 * TipTap-based rich text editor with image and video upload support.
 */
export default function RichTextEditor({ onChange, content = "", actionSlot, sectionId }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ link: false }),
            Link.configure({
                openOnClick: false,
                validate: (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href),
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
                        'data-original-src': {
                            default: null,
                            parseHTML: element => element.getAttribute('data-original-src'),
                            renderHTML: attributes => attributes['data-original-src'] ? { 'data-original-src': attributes['data-original-src'] } : {},
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
    const { pendingAltText, pendingFilter, refilterImage, isProcessing: isImageUploading, ...imageUpload } = useImageUpload(editor, sectionId);
    const videoUpload = useVideoUpload(editor);

    // HTML source mode state
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [htmlSource, setHtmlSource] = useState('');
    const htmlDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);
    const isTransitioningRef = useRef(false);

    // Link input state
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');
    const [linkError, setLinkError] = useState('');
    const linkInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (showLinkInput) linkInputRef.current?.focus();
    }, [showLinkInput]);

    const LINK_PROTOCOL_RE = /^(https?:\/\/|mailto:|tel:)/i;

    const applyLink = () => {
        const url = linkUrl.trim();
        if (url && editor) {
            if (!LINK_PROTOCOL_RE.test(url)) {
                setLinkError('URL must start with https://, mailto:, or tel:');
                return;
            }
            const text = linkText.trim();
            if (text && editor.state.selection.empty) {
                editor.chain().focus()
                    .insertContent({
                        type: 'text',
                        text,
                        marks: [{ type: 'link', attrs: { href: url } }],
                    })
                    .run();
            } else {
                editor.chain().focus().setLink({ href: url }).run();
            }
        }
        setShowLinkInput(false);
        setLinkUrl('');
        setLinkText('');
        setLinkError('');
    };

    const formatHtml = (html: string): string => {
        const parts: string[] = [];
        const preRegex = /(<pre[\s>][\s\S]*?<\/pre>)/gi;
        let lastIndex = 0;
        let match;
        while ((match = preRegex.exec(html)) !== null) {
            const before = html.slice(lastIndex, match.index);
            parts.push(before.replace(/(>)(<)/g, '$1\n$2'));
            parts.push(match[1]);
            lastIndex = match.index + match[0].length;
        }
        parts.push(html.slice(lastIndex).replace(/(>)(<)/g, '$1\n$2'));
        return parts.join('').replace(/\n\n+/g, '\n');
    };

    const toggleHtmlMode = useCallback(() => {
        if (!editor) return;
        if (isHtmlMode) {
            if (htmlDebounceRef.current) clearTimeout(htmlDebounceRef.current);
            isTransitioningRef.current = true;
            editor.commands.setContent(htmlSource);
            setIsHtmlMode(false);
        } else {
            setHtmlSource(formatHtml(editor.getHTML()));
            setIsHtmlMode(true);
        }
    }, [editor, isHtmlMode, htmlSource]);

    // Clear transition guard after isHtmlMode state settles
    useEffect(() => {
        if (!isHtmlMode && isTransitioningRef.current) {
            isTransitioningRef.current = false;
        }
    }, [isHtmlMode]);

    // Clean up debounce timer on unmount
    useEffect(() => {
        return () => {
            if (htmlDebounceRef.current) clearTimeout(htmlDebounceRef.current);
        };
    }, []);

    // Sync content from props (skip in HTML mode and during transitions)
    useEffect(() => {
        if (!isHtmlMode && !isTransitioningRef.current && editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [editor, content, isHtmlMode]);

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
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    label="Italic"
                    testId="toolbar-italic"
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    label="H1"
                    testId="toolbar-h1"
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    label="H2"
                    testId="toolbar-h2"
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    label="H3"
                    testId="toolbar-h3"
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    label="Bullet List"
                    testId="toolbar-bullet-list"
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    label="Ordered List"
                    testId="toolbar-ordered-list"
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    label="Blockquote"
                    testId="toolbar-blockquote"
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    label="Code"
                    testId="toolbar-code-block"
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={() => {
                        if (editor.isActive('link')) {
                            editor.chain().focus().unsetLink().run();
                        } else {
                            const existingHref = editor.getAttributes('link').href || '';
                            setLinkUrl(existingHref);
                            const { from, to } = editor.state.selection;
                            const selectedText = editor.state.doc.textBetween(from, to, '');
                            setLinkText(selectedText);
                            setShowLinkInput(true);
                        }
                    }}
                    isActive={editor.isActive('link')}
                    label="Link"
                    testId="toolbar-link"
                    disabled={isHtmlMode}
                />
                <span className="w-px h-6 bg-gray-300 dark:bg-gray-600 self-center" aria-hidden="true" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    label="Undo"
                    testId="toolbar-undo"
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    label="Redo"
                    testId="toolbar-redo"
                    disabled={isHtmlMode}
                />
                <span className="w-px h-6 bg-gray-300 dark:bg-gray-600 self-center" aria-hidden="true" />
                <ToolbarButton
                    onClick={toggleHtmlMode}
                    isActive={isHtmlMode}
                    label={isHtmlMode ? 'Visual' : 'HTML'}
                    testId="toolbar-html"
                />
                <span className="w-px h-6 bg-gray-300 dark:bg-gray-600 self-center" aria-hidden="true" />
                <ToolbarButton
                    onClick={imageUpload.triggerFileSelect}
                    label="Image"
                    testId="toolbar-image"
                    disabled={isHtmlMode}
                />
                <ToolbarButton
                    onClick={videoUpload.triggerFileSelect}
                    label="Video"
                    testId="toolbar-video"
                    disabled={isHtmlMode}
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
                <div className="mb-2" data-testid="link-input-bar">
                    <div className="flex items-center gap-2 flex-wrap">
                        <input
                            ref={linkInputRef}
                            type="url"
                            value={linkUrl}
                            onChange={e => { setLinkUrl(e.target.value); setLinkError(''); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                                if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); setLinkText(''); setLinkError(''); }
                            }}
                            placeholder="https://..."
                            className="flex-1 min-w-[200px] border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white"
                            data-testid="link-url-input"
                        />
                        <input
                            type="text"
                            value={linkText}
                            onChange={e => setLinkText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                                if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); setLinkText(''); setLinkError(''); }
                            }}
                            placeholder="Link text (optional)"
                            className="flex-1 min-w-[150px] border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white"
                            data-testid="link-text-input"
                        />
                        <button onClick={applyLink} className="btn btn--primary btn--sm" data-testid="link-apply">Apply</button>
                        <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkText(''); setLinkError(''); }} className="btn btn--secondary btn--sm" data-testid="link-cancel">Cancel</button>
                    </div>
                    {linkError && <p className="text-xs mt-1" style={{ color: 'var(--color-status-error)' }} data-testid="link-error">{linkError}</p>}
                </div>
            )}
            {actionSlot && (
                <div className="mb-2 flex flex-wrap items-center gap-4">
                    {actionSlot}
                </div>
            )}
            {isImageUploading && !pendingFilter && (
                <div className="mb-2 p-2 text-sm" style={{ color: 'var(--color-text-secondary)' }} data-testid="image-upload-progress">
                    Uploading image...
                </div>
            )}
            {isHtmlMode ? (
                <textarea
                    value={htmlSource}
                    onChange={e => {
                        const val = e.target.value;
                        setHtmlSource(val);
                        if (htmlDebounceRef.current) clearTimeout(htmlDebounceRef.current);
                        htmlDebounceRef.current = setTimeout(() => onChange(val), 500);
                    }}
                    className="html-source-editor"
                    data-testid="html-source-editor"
                    spellCheck={false}
                />
            ) : (
                <EditorContent editor={editor} className="border p-3 rounded min-h-[400px] dark:bg-gray-800 dark:text-white" data-testid="editor-content" />
            )}
            {!isHtmlMode && <ImageBubbleMenu editor={editor} onChangeFilter={refilterImage} />}
            {pendingFilter && createPortal(
                <ImageFilterPicker
                    imageUrl={pendingFilter.imageUrl}
                    onConfirm={(filter) => pendingFilter?.resolve(filter)}
                    onCancel={() => pendingFilter?.resolve(FILTER_CANCEL)}
                />,
                document.body
            )}
            {pendingAltText && createPortal(
                <AltTextDialog
                    onConfirm={pendingAltText.resolve}
                />,
                document.body
            )}
        </div>
    );
}

function ToolbarButton({ onClick, isActive, label, testId, disabled }: {
    onClick: () => void;
    isActive?: boolean;
    label: string;
    testId: string;
    disabled?: boolean;
}) {
    const stateClass = isActive ? 'editor-toolbar__btn--active' : 'editor-toolbar__btn--inactive';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`editor-toolbar__btn ${stateClass}`}
            data-testid={testId}
            disabled={disabled}
        >
            {label}
        </button>
    );
}
