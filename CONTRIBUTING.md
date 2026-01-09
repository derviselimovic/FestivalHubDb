# Contributing to Festival Scraper System

Thank you for your interest in contributing to the Festival Scraper System! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## 📜 Code of Conduct

This project follows a Code of Conduct to ensure a welcoming environment for all contributors:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/FestivalHubDb.git
   cd FestivalHubDb
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/derviselimovic/FestivalHubDb.git
   ```

## 💻 Development Setup

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 15 or higher
- Git

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up database:
   ```bash
   # Using Docker
   docker-compose up -d postgres
   
   # Run migrations
   npm run db:migrate
   ```

5. Validate setup:
   ```bash
   ./validate.sh
   ```

## 📁 Project Structure

```
festival-scraper/
├── src/
│   ├── scrapers/        # Web scraping modules
│   ├── api/             # Express.js API
│   ├── database/        # Database layer
│   ├── enrichment/      # Data enrichment
│   ├── cli/             # CLI interface
│   ├── jobs/            # Scheduled jobs
│   ├── utils/           # Utilities
│   └── types/           # TypeScript types
├── logs/                # Application logs
├── dist/                # Compiled JavaScript (gitignored)
└── README.md
```

## 🎨 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Follow existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer `async/await` over callbacks

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Keep lines under 120 characters
- Use meaningful commit messages

### Example

```typescript
/**
 * Fetch festival data from a given URL
 * @param url - The URL to fetch from
 * @returns Promise with scraped festival data
 */
async function fetchFestivalData(url: string): Promise<ScrapedFestival> {
  const page = await this.createPage();
  try {
    await this.navigateWithRetry(page, url);
    // ... implementation
  } finally {
    await page.close();
  }
}
```

## 🔄 Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-scraper`
- `fix/database-connection`
- `docs/update-readme`
- `refactor/improve-logging`

### Commit Messages

Follow the conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(scrapers): add Resident Advisor scraper

Implement scraper for Resident Advisor events using Playwright.
Includes rate limiting and error handling.

Closes #123
```

```
fix(api): handle null values in festival response

Add null checks to prevent API errors when optional fields are missing.
```

## 🧪 Testing

### Running Tests

Currently, the project uses manual testing. When adding features:

1. Test locally with real data
2. Verify database operations
3. Check API responses
4. Test error handling

### Adding Scrapers

When adding a new scraper:

1. Extend `BaseScraper` class
2. Implement required methods
3. Add retry logic and error handling
4. Test with actual website
5. Document any special requirements

Example:

```typescript
export class NewSourceScraper extends BaseScraper {
  constructor() {
    super({
      source: 'NewSource',
      baseUrl: 'https://newsource.com',
    });
  }

  async scrape(): Promise<ScraperResult> {
    // Implementation
  }
}
```

## 📤 Submitting Changes

### Pull Request Process

1. **Update your fork**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit:
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request** on GitHub:
   - Provide clear description
   - Reference any related issues
   - Add screenshots if applicable
   - Ensure CI checks pass

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Comments added for complex logic
- [ ] Documentation updated if needed
- [ ] TypeScript compiles without errors
- [ ] No console.log statements (use logger instead)
- [ ] Tested locally with real data
- [ ] Branch is up to date with main

## 🐛 Reporting Issues

### Before Submitting

1. Check existing issues to avoid duplicates
2. Verify the issue exists on the latest version
3. Collect relevant information:
   - Error messages and stack traces
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Issue Template

```markdown
**Description**
Clear description of the issue

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 20.10.0]
- PostgreSQL: [e.g., 15.3]

**Additional Context**
Any other relevant information, logs, screenshots, etc.
```

## 💡 Feature Requests

We welcome feature requests! Please:

1. Check if the feature already exists or is planned
2. Describe the feature and use case clearly
3. Explain why it would be valuable
4. Consider offering to implement it yourself

## 🙋 Getting Help

If you need help:

- Check the [README](README.md) and documentation
- Search existing GitHub issues
- Create a new issue with the `question` label

## 📝 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Festival Scraper System! 🎉
