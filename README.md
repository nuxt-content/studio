# nuxt-studio

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add nuxt-studio
```

That's it! You can now use Content Studio in your Nuxt app ✨


## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  npm install
  
  # Generate type stubs
  npm run dev:prepare
  
  # Develop with the playground
  npm run dev
  
  # Build the playground
  npm run dev:build
  
  # Run ESLint
  npm run lint
  
  # Run Vitest
  npm run test
  npm run test:watch
  
  # Release new version
  npm run release
  ```

</details>

## Oauth Login

### Github OAuth Application

Create github OAuth application and fill `STUDIO_GITHUB_CLIENT_ID` and `STUDIO_GITHUB_CLIENT_SECRET` in environment variables. Github application callback should be `YOUR_DOMAIN/__nuxt_content/studio/auth/github`

### Google OAuth Application

Create Google OAuth application and fill `STUDIO_GOOGLE_CLIENT_ID` and `STUDIO_GOOGLE_CLIENT_SECRET` in environment variables. Google application callback should be `YOUR_DOMAIN/__nuxt_content/studio/auth/google`
