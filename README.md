# Field Notes

Field Notes is a modern blog/content management system built with Next.js and FastAPI. It allows authenticated users to create and publish rich text content that can be viewed by anyone.

## Features

- **Modern Tech Stack**: Next.js frontend with TypeScript and FastAPI backend
- **Rich Text Editing**: Create and edit posts with a full-featured rich text editor
- **Authentication**: Secure Google OAuth authentication for content creators
- **Responsive Design**: Beautiful UI with Tailwind CSS
- **MongoDB Integration**: Persistent storage with MongoDB Atlas
- **Image Uploads**: Upload and embed images using Google Cloud Storage
- **Video Uploads**: Upload and embed videos with custom TipTap VideoExtension
- **Docker Support**: Easy deployment with Docker and docker-compose
- **Story Creation and Management**: Ability to create and manage stories
- **Project Portfolios**: Showcase projects with grid display and detail views
- **Publication Status Control**: Publish or unpublish content
- **Dark Mode Support**: Dark mode for better readability
- **Dynamic Routing**: Section-based routing via a catch-all `[...slugPath]` route
- **Content Registry**: Pluggable display system (feed, grid, static-page) driven by section configuration
- **Local Development Storage**: Filesystem-based upload storage for local development (no GCS credentials required)

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (via motor - async MongoDB driver)
- **Authentication**: Google OAuth token validation
- **File Storage**: Google Cloud Storage for image/video uploads (production), local filesystem (development)
- **Logging**: Google Cloud Logging
- **Migrations**: pymongo-migrate for schema evolution
- **Python Version**: Python 3.11+

### Frontend
- **Framework**: Next.js with TypeScript
- **UI**: Tailwind CSS for styling
- **Authentication**: NextAuth.js with Google provider
- **Rich Text Editing**: TipTap editor with image and video support
- **State Management**: React Hooks

### Infrastructure
- **Docker**: Easy deployment with Docker and docker-compose
- **Google Cloud Run**: Containerized deployment on Google Cloud

## Backend Dependencies

This project uses `pip-tools` for dependency management to ensure reproducible builds and clear separation between production and development dependencies.

### Dependency Files

- `backend/requirements.in` - Production dependencies (high-level, unpinned)
- `backend/requirements-dev.in` - Development dependencies (includes production via `-r requirements.in`)
- `backend/requirements.txt` - Compiled production dependencies (pinned versions, auto-generated)
- `backend/requirements-dev.txt` - Compiled development dependencies (pinned versions, auto-generated)

### Dependency Management Workflow

#### Adding New Dependencies

1. **Production dependency**: Add to `backend/requirements.in`
2. **Development dependency**: Add to `backend/requirements-dev.in`
3. Compile the requirements: `make deps-compile`
4. Install the updated dependencies: `make deps-dev`

#### Updating Dependencies

- Update all dependencies: `make deps-upgrade`
- Update specific dependency: Edit the `.in` file and run `make deps-compile`

#### Installing Dependencies

- Production only: `make deps`
- Development (includes production): `make deps-dev`

#### Important Notes

- **Never edit** `requirements.txt` or `requirements-dev.txt` directly
- Always edit the `.in` files and recompile
- Commit both `.in` and `.txt` files to version control
- The `.txt` files ensure reproducible builds across environments

## Testing & CI/CD

This project includes comprehensive testing and continuous integration to ensure code quality and prevent deployment of broken code.

### Testing Commands

- `make test` - Run all tests
- `make test-unit` - Run only unit tests
- `make test-integration` - Run only integration tests  
- `make test-coverage` - Run tests with HTML coverage report
- `make test-ci` - Run CI-style tests (formatting, linting, and tests with coverage)

### Code Quality

- `make format` - Auto-format code with black and isort
- `make format-check` - Check formatting without making changes

### CI/CD Workflow

The project uses GitHub Actions with two workflows:

#### 1. CI Workflow (`.github/workflows/ci.yml`)
Runs on pull requests and non-main branches:
- ✅ Code formatting checks (black, isort)
- ✅ Linting (flake8)
- ✅ Backend tests with coverage
- ✅ Frontend linting and TypeScript checks

#### 2. Deploy Workflow (`.github/workflows/deploy.yml`)
Runs on pushes to main branch:
- ✅ **Tests must pass first** - deployment fails if tests fail
- ✅ Deploys backend to Google Cloud Run
- ✅ Deploys frontend to Google Cloud Run

### Test Requirements

- All tests must pass before deployment
- Code must be properly formatted (black, isort)
- Code must pass linting (flake8)
- Maintain test coverage

## Configuration

### Environment Variables

The application requires the following environment variables:

#### Backend
- `PORT`: Backend server port
- `MONGO_USER`: MongoDB username
- `MONGO_PASSWORD`: MongoDB password
- `MONGO_CLUSTER`: MongoDB cluster name
- `MONGO_APP_NAME`: MongoDB application name
- `MONGO_HOST`: MongoDB host address
- `MONGO_DB_NAME`: MongoDB database name
- `GCS_BUCKET_NAME`: Google Cloud Storage bucket name for uploads (production)
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to GCP service account credentials file (production)
- `LOCAL_STORAGE_PATH`: Local filesystem path for uploads (development, set instead of GCS vars)

#### Frontend
- `FE_PORT`: Frontend server port
- `NEXT_PUBLIC_API_URL`: URL for the backend API (client-facing)
- `BACKEND_URL`: URL for backend API (server-to-server, for Docker)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `NEXTAUTH_SECRET`: NextAuth secret key
- `NEXTAUTH_URL`: NextAuth URL
- `NEXTAUTH_DEBUG`: Enable NextAuth debug mode (true/false)
- `UNSAFE_EVAL`: Enable unsafe-eval in CSP (true/false)
- `ENABLE_PROXY_UPLOADS`: Enable image proxy through Next.js (true/false)

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- Docker and docker-compose (optional)
- MongoDB Atlas account (or local MongoDB instance)
- Google Cloud Platform account (for image uploads)

### File Upload Storage

#### Local Development (default with Docker)

No GCS setup needed. Docker Compose sets `LOCAL_STORAGE_PATH=/app/local-uploads` and mounts `./local-uploads` as a volume. Uploaded images and videos are stored on the local filesystem and served by the backend.

#### Production (Google Cloud Storage)

1. Create a Google Cloud Platform account if you don't have one
2. Create a new project or use an existing one
3. Enable the Google Cloud Storage API
4. Create a service account with Storage Admin permissions
5. Download the service account key as JSON
6. Save the key as `gcp-credentials.json` in the root directory of the project
7. Create a Cloud Storage bucket
8. Make sure the bucket has public access or configure appropriate permissions
9. Add the bucket name to your `.env` file as `GCS_BUCKET_NAME`
10. Do NOT set `LOCAL_STORAGE_PATH` in production

### Installation

#### Using Docker

1. Clone the repository
   ```
   git clone https://github.com/ghostmonk/Field-Notes.git
   cd Field-Notes
   ```

2. Set up environment variables
   - Create `.env` file in the root directory with the required variables
   - Place your `gcp-credentials.json` file in the root directory

3. Start the application
   ```
   docker-compose up -d
   ```

#### Manual Setup

1. Clone the repository
   ```
   git clone https://github.com/ghostmonk/Field-Notes.git
   cd Field-Notes
   ```

2. Set up the backend
   ```
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

3. Set up the frontend
   ```
   cd frontend
   npm install
   npm run dev
   ```

## Usage

- Visit `http://localhost:3000` to view the blog
- Sign in with Google to create/edit posts
- Navigate to `/edit` to create a new post
- Use the image button in the editor to upload and embed images

## Deployment

The application can be deployed to any cloud provider that supports Docker containers. The frontend and backend are containerized separately and can be deployed independently if needed.

### Production Considerations

- Set up proper environment variables for production
- Configure CORS settings in the backend for your production domain
- Set up a reverse proxy (like Nginx) for production deployments
- Configure proper MongoDB security settings
- Secure your Google Cloud Storage bucket with appropriate IAM policies
- Consider using a CDN for serving images in production

## License

This project is licensed under the MIT License - see the LICENSE file for details.