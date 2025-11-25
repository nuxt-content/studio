# Nuxt Studio

[![npm version](https://img.shields.io/npm/v/nuxt-studio/alpha.svg?style=flat&colorA=020420&colorB=EEEEEE)](https://npmjs.com/package/nuxt-studio)
[![npm downloads](https://img.shields.io/npm/dm/nuxt-studio.svg?style=flat&colorA=020420&colorB=EEEEEE)](https://npm.chart.dev/nuxt-studio)
[![License](https://img.shields.io/npm/l/nuxt-studio.svg?style=flat&colorA=020420&colorB=EEEEEE)](https://npmjs.com/package/nuxt-studio)

---

## ⚠️ Alpha Version

> **Current Status: Alpha Testing**
>
> Nuxt Studio is currently in **alpha** and uses the Monaco code editor for content editing. This phase focuses on testing and stabilizing core functionality:
>
> - ✅ File operations (create, edit, delete, rename)
> - ✅ Content editing with Monaco editor
> - ✅ Media management and uploads
> - ✅ GitHub authentication and publishing workflow
>
>
> Once all file operations and GitHub publishing workflows are tested and stable, we'll release **Phase 2 (Beta)** with the full visual editor for Markdown, Vue components, and medias...
>
> Read the [announcement blog post](https://content.nuxt.com/blog/studio-module-alpha) for more details.

---

Visual edition in production for your [Nuxt Content](https://content.nuxt.com) website.

Originally offered as a standalone premium platform at https://nuxt.studio, Studio has evolved into a free, open-source, and self-hostable Nuxt module. Enable your entire team to edit website content right in production.

**Current Features (Alpha):**

- 💻 **Monaco Code Editor** - Code editor for enhanced Markdown with MDC syntax, YAML, and JSON
- 🔄 **Real-time Preview** - See your changes instantly on your production website
- 🔐 **GitHub Authentication** - Secure OAuth-based login with GitHub
- 📝 **File Management** - Create, edit, delete, and rename content files (`content/` directory)
- 🖼️ **Media Management** - Centralized media library for all your assets (`public/` directory)
- 🌳 **Git Integration** - Commit changes directly from your production website and just wait your CI/CD pipeline to deploy your changes
- 🚀 **Development Mode** - Directly edit your content files and media files in your local filesystem using the module interface

**Coming in Beta:**
- 🎨 **Visual Editor** - Visual editor for content management, from text edition to media management - all without touching code
- 🔐 **Google OAuth Authentication** - Secure OAuth-based login with Google

**Future Features:**
- 📂 **Collections view** - View and manage your content collections in a unified interface
- 🖼️ **Media optimization** - Optimize your media files in the editor
- 🤖 **AI Content Assistant** — Receive smart, AI-powered suggestions to enhance your content creation flow
- 💡 **Community-driven Features** — Have an idea? [Share your suggestions](https://github.com/nuxt-content/studio/discussions) to shape the future of Nuxt Studio

### Resources
- [📖 Documentation](https://content.nuxt.com/docs/studio/setup)
- [🎮 Live Demo](https://docus.dev/admin)

## Quick Setup

> **Note**: This alpha release provides a Monaco-based code editor. The visual WYSIWYG editor will be available in the beta release.

### 1. Module Installation

Install the module in your Nuxt application with one command:

```bash
npx nuxi module add nuxt-studio@alpha
```

Add it to your `nuxt.config` and configure your repository.

```ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/content',
    'nuxt-studio'
  ],
  studio: {
    // Your configuration
    repository: {
      provider: 'github', // default: only GitHub supported currently
      owner: 'your-username', // your GitHub owner
      repo: 'your-repo', // your GitHub repository name
      branch: 'main',
      rootDir: '' // optional: location of your content app
    }
  }
})
```

### 2. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the application details:
   - **Application name**: Your App Name
   - **Homepage URL**: Your website homepage URL
   - **Authorization callback URL**: `${YOUR_WEBSITE_URL}/${options.route}/auth/github` (default: `${YOUR_WEBSITE_URL}/_studio/auth/github`)
4. Copy the **Client ID** and generate a **Client Secret**
5. Add them to your deployment environment variables (see next section)

### 3. Environment Variables

Nuxt Studio requires environment variables for authentication and publication on your repository.

Add the previsously generated Client ID and Client Secret to your deployment environment variables.

```bash
STUDIO_GITHUB_CLIENT_ID=your_github_client_id
STUDIO_GITHUB_CLIENT_SECRET=your_github_client_secret
```

## Configuration

Configure Nuxt Studio in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-studio'],
  studio: {
    // Studio admin login route
    route: '/_studio', // default

    // Git repository configuration (required)
    repository: {
      provider: 'github', // only GitHub is supported currently (default)
      owner: 'your-username', // your GitHub owner
      repo: 'your-repo', // your GitHub repository name
      branch: 'main', // your GitHub branch
      rootDir: '' // optional: root directory for
    },
  }
})
```

## Contributing
You must clone the repository and create a local GitHub OAuth App (pointing to `http://localhost:3000` as callback URL).

Set your GitHub OAuth credentials in the `.env` file.

### Development Setup

```bash
# Install dependencies
pnpm install

# Generate type stubs
pnpm dev:prepare

# Build the app and service worker
pnpm prepack

# Terminal 1: Start the playground
pnpm dev

# Terminal 2: Start the app dev server
pnpm dev:app

# Login at http://localhost:3000/admin
```

### Project Structure

```
studio/
├── src/
│   ├── app/           # Studio editor Vue app
│   └── module/        # Nuxt module
├── playground/        # Development playground
│   ├── docus/         # Docus example
│   └── minimal/       # Minimal example
```

### Testing

```bash
# Run tests
pnpm test

# Run type checking
pnpm typecheck

# Run linter
pnpm lint
```

## Roadmap

### ✅ Phase 1 - Alpha (Current)
- [x] Monaco code editor
- [x] File operations (create, edit, delete, rename)
- [x] Media management
- [x] GitHub authentication
- [x] Development mode (**experimental**)
- [x] Git integration
- [x] Real-time preview

### 🚧 Phase 2 - Beta (In Development)
- [ ] Google OAuth authentication
- [ ] Visual editor
- [ ] Frontmatter edition as form
- [ ] Vue Component edition (props, slots)

### 🔮 Future

- [ ] GitLab provider support
- [ ] Other provider support
- [ ] Advanced conflict resolution
- [ ] Pull request generation (from a branch to the main one)
- [ ] AI-powered content suggestions

## Links

- 📖 [Documentation](https://content.nuxt.com/studio)
- 🐛 [Report a Bug](https://github.com/nuxt-content/studio/issues/new)
- 💡 [Feature Request](https://github.com/nuxt-content/studio/issues/new)
- 🗨️ [Discussions](https://github.com/nuxt-content/studio/discussions)
- 🆇 [Twitter](https://x.com/nuxtstudio)
- 🦋 [Bluesky](https://bsky.app/profile/nuxt.com)

## License

Published under the [MIT](LICENSE) license.
