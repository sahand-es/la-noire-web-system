# La Noire Web System - Frontend Tests Summary

## Overview

Created comprehensive test suite for the frontend application using:

- **Vitest** with React Testing Library for unit/integration tests
- **Playwright** for end-to-end tests

## Test Files Created (10 test files with 39+ test cases)

### 1. Setup Files

- `vitest.config.js` - Vitest configuration with jsdom environment
- `src/test/setup.js` - Test setup with @testing-library/jest-dom
- `playwright.config.js` - Playwright E2E test configuration

### 2. Component Tests (6 files)

#### `src/components/ProtectedRoute.test.jsx` (4 tests)

Tests authentication-based route guards:

- ✓ ProtectedRoute redirects to login when not authenticated
- ✓ ProtectedRoute renders children when authenticated
- ✓ GuestRoute renders children when not authenticated
- ✓ GuestRoute redirects to dashboard when authenticated

#### `src/Auth/Login.test.jsx` (4 tests)

Tests login form functionality:

- ✓ Renders login form with all fields
- ✓ Shows validation errors on empty submission
- ✓ Calls login API and navigates on success
- ✓ Displays error message on login failure

#### `src/Auth/Register.test.jsx` (5 tests)

Tests registration form functionality:

- ✓ Renders registration form with all required fields
- ✓ Shows validation errors when required fields are empty
- ✓ Calls register API and navigates on successful registration
- ✓ Displays error message on registration failure
- ✓ Has a link to login page

#### `src/HomePage/Home.test.jsx` (5 tests)

Tests home page statistics and authentication state:

- ✓ Displays loading state initially
- ✓ Displays statistics when loaded successfully
- ✓ Displays error message when statistics fail to load
- ✓ Shows login/register buttons when not logged in
- ✓ Shows dashboard button when logged in

#### `src/components/PageHeader.test.jsx` (6 tests)

Tests presentational component:

- ✓ Renders title correctly
- ✓ Renders subtitle when provided
- ✓ Does not render subtitle when not provided
- ✓ Renders action buttons when provided
- ✓ Renders with all props combined
- ✓ Renders without any optional props

#### `src/api/request.test.js` (8 tests)

Tests API request module functionality:

- ✓ Makes GET request with correct headers
- ✓ Includes Authorization header when token exists
- ✓ Makes POST request with body
- ✓ Handles 401 error and throws with status
- ✓ Handles error response with message
- ✓ Makes PUT request
- ✓ Makes PATCH request
- ✓ Makes DELETE request

### 3. E2E Tests (1 file)

#### `e2e/app.spec.js` (7 tests)

Tests end-to-end user flows:

- ✓ Navigate to login page and display form
- ✓ Show validation errors on empty form submission
- ✓ Handle login error gracefully
- ✓ Display statistics on home page
- ✓ Show Get Started button when not logged in
- ✓ Redirect to login when accessing protected route
- ✓ Navigate between pages

## Dependencies Added

```json
{
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitest/ui": "^2.1.8",
    "jsdom": "^26.0.0",
    "vitest": "^2.1.8"
  }
}
```

## NPM Scripts Added

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## Running Tests

### Install dependencies first:

```bash
cd frontend
npm install
```

### Install Playwright browsers (for E2E tests):

```bash
npx playwright install
```

### Run unit tests:

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm run test:ui            # With UI
npm run test:coverage      # With coverage report
```

### Run E2E tests:

```bash
npm run test:e2e           # Headless mode
npm run test:e2e:ui        # With Playwright UI
npx playwright test --headed  # Headed mode (see browser)
```

## Test Coverage Areas

1. **Authentication & Authorization**
   - Login/Registration flows
   - Protected routes
   - Token management
   - Error handling

2. **API Integration**
   - HTTP methods (GET, POST, PUT, PATCH, DELETE)
   - Authorization headers
   - Error responses
   - Success responses

3. **UI Components**
   - Form validation
   - Loading states
   - Error messages
   - Conditional rendering

4. **User Interactions**
   - Form submissions
   - Button clicks
   - Navigation
   - Input validation

5. **End-to-End Flows**
   - Complete user journeys
   - Page navigation
   - API mocking
   - Error scenarios

## Documentation

See [TESTING.md](./TESTING.md) for detailed testing guide and best practices.

## Notes

- All tests use modern testing practices (Arrange-Act-Assert pattern)
- Tests focus on user behavior rather than implementation details
- Mocking is used appropriately for API calls and routing
- E2E tests include API route mocking for predictable testing
- Setup includes automatic cleanup after each test
- Compatible with CI/CD pipelines
