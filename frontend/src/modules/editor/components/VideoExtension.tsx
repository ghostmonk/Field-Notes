import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import React from 'react';

// Video attributes interface
interface VideoAttributes {
  src?: string;
  poster?: string;
  width?: number;
  height?: number;
  controls?: boolean;
  autoplay?: boolean;
  muted?: boolean;
}

// Video command options interface
interface SetVideoOptions {
  src: string;
  poster?: string;
  width?: number;
  height?: number;
}

// Video component props - simplified for TipTap compatibility
interface VideoComponentProps {
  node: {
    attrs: VideoAttributes;
  };
}

// Video Node View Component
function VideoComponent({ node }: VideoComponentProps) {
  const { src, poster, width, height, controls = true, autoplay = false, muted = true } = node.attrs;

  if (!src) {
    return (
      <NodeViewWrapper className="video-wrapper">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400">Video loading...</p>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="video-wrapper">
      <div className="relative rounded overflow-hidden bg-black">
        <video
          src={src}
          poster={poster}
          width={width}
          height={height}
          controls={controls}
          autoPlay={autoplay}
          muted={muted}
          preload="metadata"
          className="w-full h-auto max-w-full"
          style={{ maxHeight: '500px' }}
        >
          <p>Your browser doesn&apos;t support video playback.</p>
        </video>
        
        {/* Optional overlay with video info */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          Video
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// Video Extension Definition
export const VideoExtension = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.getAttribute('src'),
        renderHTML: attributes => {
          if (!attributes.src) {
            return {};
          }
          return { src: attributes.src };
        },
      },
      poster: {
        default: null,
        parseHTML: element => element.getAttribute('poster'),
        renderHTML: attributes => {
          if (!attributes.poster) {
            return {};
          }
          return { poster: attributes.poster };
        },
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return { height: attributes.height };
        },
      },
      controls: {
        default: true,
        parseHTML: element => element.hasAttribute('controls'),
        renderHTML: attributes => {
          if (!attributes.controls) {
            return {};
          }
          return { controls: '' };
        },
      },
      autoplay: {
        default: false,
        parseHTML: element => element.hasAttribute('autoplay'),
        renderHTML: attributes => {
          if (!attributes.autoplay) {
            return {};
          }
          return { autoplay: '' };
        },
      },
      muted: {
        default: true,
        parseHTML: element => element.hasAttribute('muted'),
        renderHTML: attributes => {
          if (!attributes.muted) {
            return {};
          }
          return { muted: '' };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'video',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoComponent);
  },
  addCommands() {
    return {
      setVideo: (options: SetVideoOptions) => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    } as any;
  },
});

export default VideoExtension;
