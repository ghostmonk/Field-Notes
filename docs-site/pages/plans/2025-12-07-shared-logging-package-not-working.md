# Shared logging package not working Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** errors deploying backend and cloud function as there is something not quite right with the shared logging

**Architecture:** See task descriptions below.

**Tech Stack:** See implementation details.

---

### Task 1: Add missing logger API methods to glogger package

**Files:**
- Test: `shared/python/tests/test_logger_api.py`
- Modify: `shared/python/glogger/factory.py:71-94`

**Step 1: Create test file for new logger API methods**

```python
"""Tests for logger API compatibility methods."""
import pytest
from glogger.factory import DefaultLogger
from glogger.providers.console import ConsoleProvider
from glogger.interfaces import LogLevel


class MockProvider:
    """Mock provider for testing."""
    def __init__(self):
        self.logged_entries = []
    
    def log(self, entry):
        self.logged_entries.append(entry)
    
    def close(self):
        pass


class TestLoggerCompatibilityAPI:
    """Test the *_with_context methods for backward compatibility."""
    
    def test_info_with_context(self):
        """Test info_with_context method."""
        provider = MockProvider()
        logger = DefaultLogger("test", provider, {})
        
        logger.info_with_context("Test message", {"key": "value", "request_id": "123"})
        
        assert len(provider.logged_entries) == 1
        entry = provider.logged_entries[0]
        assert entry.message == "Test message"
        assert entry.level == LogLevel.INFO
        assert entry.context.custom["key"] == "value"
        assert entry.context.custom["request_id"] == "123"
    
    def test_error_with_context(self):
        """Test error_with_context method."""
        provider = MockProvider()
        logger = DefaultLogger("test", provider, {})
        
        logger.error_with_context("Error occurred", {"status_code": 500, "path": "/api/test"})
        
        assert len(provider.logged_entries) == 1
        entry = provider.logged_entries[0]
        assert entry.message == "Error occurred"
        assert entry.level == LogLevel.ERROR
        assert entry.context.custom["status_code"] == 500
        assert entry.context.custom["path"] == "/api/test"
    
    def test_exception_with_context(self):
        """Test exception_with_context method."""
        provider = MockProvider()
        logger = DefaultLogger("test", provider, {})
        
        test_exception = ValueError("Test error")
        logger.exception_with_context(
            "Exception occurred",
            {"error_type": "ValueError", "request_id": "456"}
        )
        
        assert len(provider.logged_entries) == 1
        entry = provider.logged_entries[0]
        assert entry.message == "Exception occurred"
        assert entry.level == LogLevel.ERROR
        assert entry.context.custom["error_type"] == "ValueError"
        assert entry.context.custom["request_id"] == "456"
    
    def test_info_with_context_empty_dict(self):
        """Test info_with_context with empty context dict."""
        provider = MockProvider()
        logger = DefaultLogger("test", provider, {})
        
        logger.info_with_context("Message", {})
        
        assert len(provider.logged_entries) == 1
        assert provider.logged_entries[0].message == "Message"
    
    def test_error_with_context_merges_default_context(self):
        """Test that *_with_context methods merge with default context."""
        provider = MockProvider()
        logger = DefaultLogger("test", provider, {"default_key": "default_value"})
        
        logger.error_with_context("Error", {"error_key": "error_value"})
        
        entry = provider.logged_entries[0]
        assert entry.context.custom["default_key"] == "default_value"
        assert entry.context.custom["error_key"] == "error_value"
```

Expected: Test file created at shared/python/tests/test_logger_api.py

**Step 2: Run tests to verify they fail**

Run: `cd /Users/nicholas/Documents/code/turbulence && source ~/Documents/venvs/turbulence/bin/activate && python -m pytest shared/python/tests/test_logger_api.py -v`
Expected: AttributeError: 'DefaultLogger' object has no attribute 'info_with_context'
AttributeError: 'DefaultLogger' object has no attribute 'error_with_context'
AttributeError: 'DefaultLogger' object has no attribute 'exception_with_context'
FAILED (multiple test failures)

**Step 3: Add compatibility methods to DefaultLogger class**

```python
    def info_with_context(self, message: str, context: Dict[str, Any]) -> None:
        """Log an info message with context dict (compatibility method)."""
        self.info(message, **context)

    def error_with_context(self, message: str, context: Dict[str, Any]) -> None:
        """Log an error message with context dict (compatibility method)."""
        self.error(message, **context)

    def exception_with_context(self, message: str, context: Dict[str, Any]) -> None:
        """Log an exception with context dict (compatibility method)."""
        self.error(message, **context)
```

Expected: Three new methods added to DefaultLogger after line 94 in factory.py

**Step 4: Run tests to verify they pass**

Run: `cd /Users/nicholas/Documents/code/turbulence && source ~/Documents/venvs/turbulence/bin/activate && python -m pytest shared/python/tests/test_logger_api.py -v`
Expected: test_info_with_context PASSED
test_error_with_context PASSED
test_exception_with_context PASSED
test_info_with_context_empty_dict PASSED
test_error_with_context_merges_default_context PASSED
5 passed

**Step 5: Commit the logger API changes**

Run: `cd /Users/nicholas/Documents/code/turbulence && git add shared/python/glogger/factory.py shared/python/tests/test_logger_api.py && git commit -m "$(cat <<'EOF'
feat: add compatibility methods for logger API

Add info_with_context, error_with_context, and exception_with_context
methods to DefaultLogger for backward compatibility with existing
backend code that expects these method signatures.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"`
Expected: [main abc1234] feat: add compatibility methods for logger API
 2 files changed

**Commit:**
```bash
git add shared/python/tests/test_logger_api.py shared/python/glogger/factory.py
git commit -m "feat: add compatibility methods for logger API"
```

---

### Task 2: Fix backend Dockerfile to include complete shared package

**Files:**
- Test: `backend/Dockerfile.test`
- Modify: `backend/Dockerfile:5-7`

**Step 1: Create test Dockerfile to verify build**

```python
FROM python:3.13-slim

WORKDIR /app

# Test that we copy the complete shared package structure
COPY shared/python/ ./shared/python/
COPY backend/requirements.txt ./requirements.txt

# This should succeed if setup.py is present
RUN pip install --no-cache-dir -r requirements.txt

# Verify glogger can be imported
RUN python -c "from glogger import logger; print('glogger imported successfully')"

COPY backend/ ./

ENV PORT=8080
EXPOSE ${PORT}
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
```

Expected: Test Dockerfile created at backend/Dockerfile.test

**Step 2: Run test build to verify it fails with current structure**

Run: `cd /Users/nicholas/Documents/code/turbulence && docker build -f backend/Dockerfile.test -t backend-test .`
Expected: ERROR: Could not find a version that satisfies the requirement glogger
ERROR: Directory './shared/python' is not installable
Build fails

**Step 3: Update backend Dockerfile to copy complete shared package**

```python
# Change line 5 from:
# COPY shared/python/glogger/ ./shared/python/glogger/
# To:
COPY shared/python/ ./shared/python/
```

Expected: Line 5 in backend/Dockerfile modified to copy entire shared/python directory

**Step 4: Run test build to verify it passes**

Run: `cd /Users/nicholas/Documents/code/turbulence && docker build -f backend/Dockerfile.test -t backend-test . && docker run --rm backend-test python -c "from glogger import logger; print('Success')"`
Expected: Successfully built backend-test
Success
Build succeeds and glogger imports correctly

**Step 5: Clean up test Dockerfile**

Run: `cd /Users/nicholas/Documents/code/turbulence && rm backend/Dockerfile.test`
Expected: Test Dockerfile removed

**Step 6: Commit the backend Dockerfile fix**

Run: `cd /Users/nicholas/Documents/code/turbulence && git add backend/Dockerfile && git commit -m "$(cat <<'EOF'
fix: copy complete shared package in backend Dockerfile

Change COPY directive to include entire shared/python directory
including setup.py, which is required for pip editable install.

Previously only copied glogger/ subdirectory, causing pip install
to fail when trying to install -e ./shared/python.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"`
Expected: [main def5678] fix: copy complete shared package in backend Dockerfile
 1 file changed

**Commit:**
```bash
git add backend/Dockerfile.test backend/Dockerfile
git commit -m "fix: copy complete shared package in backend Dockerfile"
```

---

### Task 3: Fix cloud function Dockerfile to include complete shared package

**Files:**
- Test: `cloud-functions/video-processor/Dockerfile.test`
- Modify: `cloud-functions/video-processor/Dockerfile:16-18`

**Step 1: Create test Dockerfile for cloud function**

```python
FROM functions-framework-python:3.11

RUN apt-get update && \
    apt-get install -y \
        ffmpeg \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

RUN ffmpeg -version && ffprobe -version

WORKDIR /workspace

# Test copying complete shared package
COPY shared/python/ ./shared/python/
COPY cloud-functions/video-processor/ ./

# This should succeed if setup.py is present
RUN pip install --no-cache-dir -r requirements.txt

# Verify glogger can be imported
RUN python -c "from glogger import get_component_logger; logger = get_component_logger('test'); print('glogger imported successfully')"
```

Expected: Test Dockerfile created at cloud-functions/video-processor/Dockerfile.test

**Step 2: Run test build to verify it fails with current structure**

Run: `cd /Users/nicholas/Documents/code/turbulence && docker build -f cloud-functions/video-processor/Dockerfile.test -t video-processor-test .`
Expected: ERROR: Could not find a version that satisfies the requirement glogger
ERROR: Directory './shared/python' is not installable
Build fails

**Step 3: Update cloud function Dockerfile to copy complete shared package**

```python
# Change line 16 from:
# COPY shared/python/glogger/ ./shared/python/glogger/
# To:
COPY shared/python/ ./shared/python/
```

Expected: Line 16 in cloud-functions/video-processor/Dockerfile modified

**Step 4: Run test build to verify it passes**

Run: `cd /Users/nicholas/Documents/code/turbulence && docker build -f cloud-functions/video-processor/Dockerfile.test -t video-processor-test . && docker run --rm video-processor-test python -c "from glogger import get_component_logger; print('Success')"`
Expected: Successfully built video-processor-test
Success
Build succeeds and glogger imports correctly

**Step 5: Clean up test Dockerfile**

Run: `cd /Users/nicholas/Documents/code/turbulence && rm cloud-functions/video-processor/Dockerfile.test`
Expected: Test Dockerfile removed

**Step 6: Commit the cloud function Dockerfile fix**

Run: `cd /Users/nicholas/Documents/code/turbulence && git add cloud-functions/video-processor/Dockerfile && git commit -m "$(cat <<'EOF'
fix: copy complete shared package in video-processor Dockerfile

Change COPY directive to include entire shared/python directory
including setup.py, which is required for pip editable install.

Previously only copied glogger/ subdirectory, causing pip install
to fail when trying to install -e ./shared/python.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"`
Expected: [main ghi9012] fix: copy complete shared package in video-processor Dockerfile
 1 file changed

**Commit:**
```bash
git add cloud-functions/video-processor/Dockerfile.test cloud-functions/video-processor/Dockerfile
git commit -m "fix: copy complete shared package in video-processor Dockerfile"
```

---

### Task 4: Verify backend application starts successfully

**Files:**
- Test: `backend/app.py`

**Step 1: Create integration test script**

```python
#!/bin/bash
# Test that backend builds and starts without import errors

set -e

echo "Building backend Docker image..."
docker build -f backend/Dockerfile -t turbulence-backend:test .

echo "Starting backend container..."
docker run -d --name backend-test \
  -e MONGO_URI="mongodb://test:test@localhost:27017" \
  -e GCS_BUCKET_NAME="test-bucket" \
  -e GOOGLE_APPLICATION_CREDENTIALS_JSON="{}" \
  -p 8080:8080 \
  turbulence-backend:test

echo "Waiting for backend to start..."
sleep 5

echo "Testing health endpoint..."
curl -f http://localhost:8080/health || (docker logs backend-test && exit 1)

echo "Checking logs for import errors..."
docker logs backend-test 2>&1 | grep -i "attributeerror.*with_context" && exit 1 || true

echo "Stopping container..."
docker stop backend-test
docker rm backend-test

echo "Backend test passed!"
```

Expected: Integration test script created

**Step 2: Run integration test without fixes (expect failure)**

Run: `cd /Users/nicholas/Documents/code/turbulence && chmod +x test-backend.sh && ./test-backend.sh`
Expected: AttributeError: 'DefaultLogger' object has no attribute 'error_with_context'
Test fails due to missing methods

**Step 3: Apply all fixes and rebuild**

Run: `cd /Users/nicholas/Documents/code/turbulence && docker build -f backend/Dockerfile -t turbulence-backend:test .`
Expected: Successfully built turbulence-backend:test
All layers build successfully

**Step 4: Run integration test with fixes (expect success)**

Run: `cd /Users/nicholas/Documents/code/turbulence && ./test-backend.sh`
Expected: Backend test passed!
No AttributeError in logs
Health endpoint returns 200

**Step 5: Clean up test artifacts**

Run: `cd /Users/nicholas/Documents/code/turbulence && rm test-backend.sh && docker rmi turbulence-backend:test`
Expected: Test script and image removed

---

### Task 5: Verify cloud function builds successfully

**Files:**
- Test: `cloud-functions/video-processor/main.py`

**Step 1: Create cloud function test script**

```python
#!/bin/bash
# Test that video-processor cloud function builds successfully

set -e

echo "Building video-processor Docker image..."
docker build -f cloud-functions/video-processor/Dockerfile -t video-processor:test .

echo "Verifying glogger imports..."
docker run --rm video-processor:test python -c "from glogger import get_component_logger; logger = get_component_logger('test'); logger.info('Test message'); print('SUCCESS')"

echo "Cleaning up..."
docker rmi video-processor:test

echo "Cloud function test passed!"
```

Expected: Test script created for cloud function

**Step 2: Run cloud function build test without fix (expect failure)**

Run: `cd /Users/nicholas/Documents/code/turbulence && chmod +x test-cloud-function.sh && ./test-cloud-function.sh`
Expected: ERROR: Directory './shared/python' is not installable
Build fails

**Step 3: Apply Dockerfile fix and rebuild**

Run: `cd /Users/nicholas/Documents/code/turbulence && docker build -f cloud-functions/video-processor/Dockerfile -t video-processor:test .`
Expected: Successfully built video-processor:test
All layers build successfully

**Step 4: Run cloud function test with fix (expect success)**

Run: `cd /Users/nicholas/Documents/code/turbulence && ./test-cloud-function.sh`
Expected: SUCCESS
Cloud function test passed!

**Step 5: Clean up test artifacts**

Run: `cd /Users/nicholas/Documents/code/turbulence && rm test-cloud-function.sh`
Expected: Test script removed

---

### Task 6: Document the logger API usage patterns

**Files:**
- Modify: `shared/python/README.md`

**Step 1: Create test for README code examples**

```python
"""Test that README examples are valid."""
import pytest
from glogger import logger, get_component_logger


def test_readme_basic_usage():
    """Test basic usage examples from README."""
    # Standard API
    logger.info("User logged in", user_id="12345", ip_address="192.168.1.1")
    logger.error("Database connection failed", error_code="DB_001", retry_count=3)
    
    # Compatibility API
    logger.info_with_context("Request started", {"method": "GET", "path": "/api/users"})
    logger.error_with_context("Request failed", {"status_code": 500, "error": "Internal error"})
    

def test_readme_context_logger():
    """Test context logger examples from README."""
    request_logger = logger.with_context(request_id="abc-123", user_id="user-456")
    request_logger.info("Processing request")
    request_logger.error("Request failed")


def test_readme_component_logger():
    """Test component logger examples from README."""
    auth_logger = get_component_logger("auth-service")
    auth_logger.info("User authentication started")
    auth_logger.error("Authentication failed")
```

Expected: README examples test created

**Step 2: Run README examples test (expect failure due to missing docs)**

Run: `cd /Users/nicholas/Documents/code/turbulence && source ~/Documents/venvs/turbulence/bin/activate && python -m pytest shared/python/tests/test_readme_examples.py -v`
Expected: Tests pass but README needs updates

**Step 3: Update README with API usage documentation**

```python
Add a new section after existing usage examples:

## API Methods

The logger provides two API styles for compatibility:

### Standard API (Recommended)

Pass context as keyword arguments:

```python
from glogger import logger

# Log with context
logger.info("User logged in", user_id="12345", ip_address="192.168.1.1")
logger.error("Database error", error_code="DB_001", retry_count=3)
```

### Compatibility API

Pass context as a dictionary (for backward compatibility):

```python
from glogger import logger

# Log with context dictionary
logger.info_with_context("Request started", {"method": "GET", "path": "/api/users"})
logger.error_with_context("Request failed", {"status_code": 500})
logger.exception_with_context("Unhandled error", {"request_id": "abc-123"})
```

### Context Logger Pattern

Create a logger with persistent context:

```python
from glogger import logger

# Create logger with default context
request_logger = logger.with_context(request_id="abc-123", user_id="user-456")

# All logs include the default context
request_logger.info("Processing request")  # Includes request_id and user_id
request_logger.error("Request failed")      # Includes request_id and user_id
```

## Deployment

When deploying with Docker, ensure you copy the complete shared package:

```dockerfile
# Correct - copies entire package including setup.py
COPY shared/python/ ./shared/python/

# Incorrect - missing setup.py
COPY shared/python/glogger/ ./shared/python/glogger/
```

The `requirements.txt` uses editable install which requires `setup.py`:

```
-e ./shared/python
```
```

Expected: README updated with API documentation and deployment notes

**Step 4: Verify README examples still work**

Run: `cd /Users/nicholas/Documents/code/turbulence && source ~/Documents/venvs/turbulence/bin/activate && python -m pytest shared/python/tests/test_readme_examples.py -v`
Expected: All README example tests pass

**Step 5: Commit documentation updates**

Run: `cd /Users/nicholas/Documents/code/turbulence && git add shared/python/README.md shared/python/tests/test_readme_examples.py && git commit -m "$(cat <<'EOF'
docs: add API usage patterns and deployment guide

Document both standard and compatibility API methods.
Add deployment section explaining correct Dockerfile setup
for editable package installation.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"`
Expected: [main jkl3456] docs: add API usage patterns and deployment guide
 2 files changed

**Commit:**
```bash
git add shared/python/README.md
git commit -m "docs: add API usage patterns and deployment guide"
```

---
