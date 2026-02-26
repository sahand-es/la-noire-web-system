# Frontend Testing

This project uses **Vitest** (with React Testing Library) for unit/integration tests and **Playwright** for end-to-end tests.

## Test Structure

```
frontend/
├── src/
│   ├── test/
│   │   └── setup.js           # Test setup and configuration
│   ├── components/
│   │   └── *.test.jsx         # Component tests
│   ├── Auth/
│   │   └── *.test.jsx         # Auth component tests
│   ├── HomePage/
│   │   └── *.test.jsx         # Page tests
│   └── api/
│       └── *.test.js          # API module tests
├── e2e/
│   └── *.spec.js              # E2E tests with Playwright
├── vitest.config.js           # Vitest configuration
└── playwright.config.js       # Playwright configuration
```

## Running Tests

### Unit/Integration Tests (Vitest + React Testing Library)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/components/ProtectedRoute.test.jsx
```

### End-to-End Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npx playwright test --headed

# Run specific E2E test
npx playwright test e2e/app.spec.js
```

## Test Coverage

### Unit/Integration Tests (7 test files)

1. **ProtectedRoute.test.jsx** - Route guards and authentication checks
   - ProtectedRoute redirects to login when not authenticated
   - ProtectedRoute renders children when authenticated
   - GuestRoute renders children when not authenticated
   - GuestRoute redirects to dashboard when authenticated

2. **Login.test.jsx** - Login component functionality
   - Renders login form with all fields
   - Shows validation errors on empty submission
   - Calls login API and navigates on success
   - Displays error message on login failure

3. **Home.test.jsx** - Home page component
   - Displays loading state initially
   - Displays statistics when loaded successfully
   - Displays error message when statistics fail to load
   - Shows login/register buttons when not logged in
   - Shows dashboard button when logged in

4. **request.test.js** - API request module
   - Makes GET request with correct headers
   - Includes Authorization header when token exists
   - Makes POST request with body
   - Handles 401 error and throws with status
   - Handles error response with message
   - Makes PUT request
   - Makes PATCH request
   - Makes DELETE request

### E2E Tests (1 test file with 7 scenarios)

5. **app.spec.js** - End-to-end user flows
   - Navigate to login page and display form
   - Show validation errors on empty form submission
   - Handle login error gracefully
   - Display statistics on home page
   - Show Get Started button when not logged in
   - Redirect to login when accessing protected route
   - Navigate between pages

## Writing New Tests

### Unit Test Example

```javascript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### E2E Test Example

```javascript
import { test, expect } from "@playwright/test";

test("my test", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Welcome");
});
```

## Test Best Practices

- **Arrange-Act-Assert**: Structure tests clearly
- **Test user behavior**: Focus on what users see and do
- **Mock external dependencies**: API calls, timers, etc.
- **Clean up**: Use beforeEach/afterEach for setup/teardown
- **Descriptive names**: Test names should explain what they verify
- **Avoid implementation details**: Test behavior, not internal state

## Debugging Tests

### Vitest

```bash
# Run with debug output
npm test -- --reporter=verbose

# Run single test in watch mode
npm test -- --watch ProtectedRoute.test.jsx
```

### Playwright

```bash
# Run with debug mode
npx playwright test --debug

# Generate trace for failed tests
npx playwright test --trace on

# Show trace
npx playwright show-trace trace.zip
```

## CI/CD Integration

Tests can be run in CI/CD pipelines:

```yaml
# Example for GitHub Actions
- name: Run unit tests
  run: npm test

- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
```
