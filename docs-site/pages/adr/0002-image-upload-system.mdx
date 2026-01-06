# ADR 0002: Image Upload System Implementation

## Status
Accepted

## Context
The blog application needed a way for users to include images in their stories. Key requirements included:
1. Secure file uploads with proper validation
2. Reliable storage solution for uploaded images
3. Seamless integration with the rich text editor
4. Content Security Policy (CSP) compliance
5. Separation between client and server responsibilities
6. Responsive images with different sizes for different devices

## Decision
We decided to implement an image upload system with the following architecture:
- Backend upload handler for file validation and storage using Google Cloud Storage (GCS)
- Frontend API proxy to handle authentication and streaming files to the backend
- TipTap editor integration with Image extension
- Proper CSP configuration to allow necessary connections
- Dual-mode URL configuration for development and production environments
- Responsive image handling with srcset to optimize for different devices
- WebP format conversion for improved performance

### Responsive Images Implementation
- Generate multiple image sizes (1200px, 750px, 500px width) for each uploaded image
- Use WebP format for better compression and quality
- Implement srcset in HTML to allow browsers to choose the appropriate image size
- Create a script to convert existing images to the new format

## Consequences
### Positive
- Secure file handling with validation for type and size
- Scalable storage solution using Google Cloud Storage
- Upload progress indication in the editor
- Proper error handling and feedback
- Improved editor capabilities and user experience
- Better performance on mobile devices with appropriate image sizes
- Reduced bandwidth usage with WebP format
- Improved page load times with optimized images

### Negative
- Increased configuration complexity
- Additional security considerations for file uploads
- Need for different backend URL configurations between environments
- CSP configuration complexity to allow necessary connections
- Increased storage requirements for multiple image sizes
- Added complexity for image sanitization

## Implementation Notes
- Added uploads.py handler in backend with GCS integration
- Created upload-proxy API in frontend for secure file streaming
- Extended RichTextEditor component with image upload capabilities
- Updated CSP settings to allow GCS and Google authentication
- Added environment configuration for both Docker-based development and production
- Implemented DOMPurify configuration to allow srcset attributes
- Created utility script to convert existing images to WebP with multiple sizes 