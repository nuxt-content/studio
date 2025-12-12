import { eventHandler, getQuery, setCookie, sendRedirect } from 'h3'
import { useRuntimeConfig } from '#imports'

export default eventHandler((event) => {
  const { redirect } = getQuery(event)
  if (redirect) {
    setCookie(event, 'studio-redirect', String(redirect), {
      httpOnly: true,
    })
  }

  // Get configuration from runtime config instead of process.env
  // This allows the configuration to be set via nuxt.config.ts dynamically
  const config = useRuntimeConfig(event)
  const studioConfig = config.studio || {}
  const authConfig = studioConfig.auth || {}

  const hasGithub = !!(authConfig.github?.clientId && authConfig.github?.clientSecret)
  const hasGitlab = !!(authConfig.gitlab?.applicationId && authConfig.gitlab?.applicationSecret)
  const hasGoogle = !!(authConfig.google?.clientId && authConfig.google?.clientSecret)
  const hasSupabase = !!(authConfig.supabase?.url && authConfig.supabase?.key)

  // Automatically redirect to the configured provider's OAuth endpoint

  // 1. Priority: If ONLY Supabase is configured, redirect immediately server-side
  // The SSR check is handled in the /auth/supabase route by checking cookies
  if (!hasGithub && !hasGitlab && !hasGoogle && hasSupabase) {
    return sendRedirect(event, '/__nuxt_studio/auth/supabase')
  }

  // 2. Priority: If ONLY Google is configured (and no Git provider auth), redirect immediately
  if (!hasGithub && !hasGitlab && hasGoogle && !hasSupabase) {
    return sendRedirect(event, '/__nuxt_studio/auth/google')
  }

  // 3. Fallback: If Google or Supabase are NOT enabled, redirect to the git provider (GitHub/GitLab)
  // This is the default behavior for users using Studio purely with GitHub/GitLab OAuth
  if (!hasGoogle && !hasSupabase) {
    const provider = config.public.studio?.repository?.provider || 'github'
    return sendRedirect(event, `/__nuxt_studio/auth/${provider}`)
  }

  // 4. If multiple providers are enabled (e.g. GitHub AND Supabase), show the login page with buttons
  // This happens if you haven't commented out STUDIO_GITHUB_CLIENT_ID in your .env

  const githubButton = hasGithub
    ? `<a href="#" class="provider-btn github" data-provider="github">
                <svg viewBox="0 0 16 16" version="1.1" aria-hidden="true">
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                </svg>
                Continue with GitHub
            </a>`
    : ''

  const gitlabButton = hasGitlab
    ? `<a href="#" class="provider-btn gitlab" data-provider="gitlab">
                <svg viewBox="0 0 380 380" aria-hidden="true">
                    <g fill="#ffffff">
                        <path d="M282.83,170.73l-.27-.69-26.14-68.22a6.81,6.81,0,0,0-2.69-3.24,7,7,0,0,0-8,.43,7,7,0,0,0-2.32,3.52l-17.65,54H154.29l-17.65-54A6.86,6.86,0,0,0,134.32,99a7,7,0,0,0-8-.43,6.87,6.87,0,0,0-2.69,3.24L97.44,170l-.26.69a48.54,48.54,0,0,0,16.1,56.1l.09.07.24.17,39.82,29.82,19.7,14.91,12,9.06a8.07,8.07,0,0,0,9.76,0l12-9.06,19.7-14.91,40.06-30,.1-.08A48.56,48.56,0,0,0,282.83,170.73Z"/>
                    </g>
                </svg>
                Continue with GitLab
            </a>`
    : ''

  const googleButton = hasGoogle
    ? `<a href="#" class="provider-btn google" data-provider="google">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
            </a>`
    : ''

  const supabaseButton = hasSupabase
    ? `<a href="#" class="provider-btn supabase" data-provider="supabase">
                <svg width="109" height="113" viewBox="0 0 109 113" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint0_linear)"/>
                    <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint1_linear)" fill-opacity="0.2"/>
                    <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E"/>
                    <defs>
                    <linearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#249361"/>
                    <stop offset="1" stop-color="#3ECF8E"/>
                    </linearGradient>
                    <linearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse">
                    <stop/>
                    <stop offset="1" stop-opacity="0"/>
                    </linearGradient>
                    </defs>
                </svg>
                Continue with Supabase
            </a>`
    : ''

  // HTML Generated by v0
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <title>Content Studio</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>
      (function () {
        var storageListenerKey = 'studio-auth-popup'
        var supabaseUrl = ${JSON.stringify(authConfig.supabase?.url || '')}

        function navigateToProvider(provider) {
          var url = '/__nuxt_studio/auth/' + provider
          // For Supabase, we need to manually pass the access_token from cookies
          if (provider === 'supabase') {
            var token = getSupabaseToken()
            if (token) {
              url += '?access_token=' + token
            }
          }
          window.location.assign(url)
        }

        function getSupabaseToken() {
          if (!supabaseUrl) return null
          try {
            // Extract project ref from URL (e.g. https://<project-ref>.supabase.co)
            var url = new URL(supabaseUrl)
            var projectId = url.hostname.split('.')[0]
            var key = 'sb-' + projectId + '-auth-token'

            // Try Cookies (Supabase often stores session here for SSR)
            var nameEQ = key + "=";
            var ca = document.cookie.split(';');
            for(var i=0;i < ca.length;i++) {
              var c = ca[i];
              while (c.charAt(0)==' ') c = c.substring(1,c.length);
              if (c.indexOf(nameEQ) == 0) {
                var val = decodeURIComponent(c.substring(nameEQ.length,c.length));
                // Handle Nuxt's default cookie serialization (base64)
                if (val.indexOf('base64-') === 0) {
                  try {
                    val = atob(val.slice(7))
                  } catch (e) {
                    console.error('Failed to decode base64 cookie', e)
                  }
                }
                return JSON.parse(val).access_token;
              }
            }
          } catch (e) {
            console.error('Failed to get Supabase token', e)
          }
          return null
        }

        function notifyOpenerAndClose() {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.localStorage.setItem('temp-' + storageListenerKey, String(Date.now()))
            }
          } catch (_) {}
          setTimeout(function () { window.close() }, 100)
        }

        // If this page was opened as a popup with ?done=1, signal the opener and close
        var params = new URLSearchParams(window.location.search)
        if (params.get('done') === '1') {
          notifyOpenerAndClose()
        }

        window.addEventListener('DOMContentLoaded', function () {
          var buttons = document.querySelectorAll('.provider-btn')
          buttons.forEach(function(btn) {
            btn.addEventListener('click', function (e) {
              e.preventDefault()
              var provider = btn.getAttribute('data-provider')
              navigateToProvider(provider)
            })
          })
        })
      })()
    </script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --background: #0d1117;
            --surface: #161b22;
            --surface-hover: #21262d;
            --border: #30363d;
            --text-primary: #f0f6fc;
            --text-secondary: #8b949e;
            --github: #24292f;
            --github-hover: #32383f;
            --gitlab: #fc6d26;
            --gitlab-hover: #e85b15;
            --google: #ffffff;
            --google-hover: #f8f9fa;
            --google-text: #1f1f1f;
            --supabase: #1c1c1c;
            --supabase-hover: #2a2a2a;
            --supabase-text: #3ecf8e;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            background: var(--background);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1.5;
        }

        .login-container {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 48px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 16px 32px rgba(1, 4, 9, 0.85);
        }

        .logo {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .logo img {
            width: 48px;
            height: 48px;
        }

        .header {
            text-align: center;
            margin-bottom: 24px;
            padding-top: 12px;
        }

        .header h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        .header p {
            color: var(--text-secondary);
            font-size: 16px;
        }

        .providers {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .provider-btn {
            width: 100%;
            border: 1px solid var(--border);
            padding: 14px 20px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .provider-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .provider-btn svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }

        .provider-btn.gitlab svg {
            height: 30px;
            width: 30px;
        }

        .provider-btn.github {
            background: var(--github);
            color: var(--text-primary);
        }

        .provider-btn.github:hover {
            background: var(--github-hover);
            border-color: var(--github-hover);
        }

        .provider-btn.github svg {
            fill: currentColor;
        }

        .provider-btn.gitlab {
            background: var(--gitlab);
            color: #ffffff;
            border-color: var(--gitlab);
        }

        .provider-btn.gitlab:hover {
            background: var(--gitlab-hover);
            border-color: var(--gitlab-hover);
        }

        .provider-btn.google {
            background: var(--google);
            color: var(--google-text);
            border-color: #dadce0;
        }

        .provider-btn.google:hover {
            background: var(--google-hover);
            border-color: #d2d3d4;
        }

        .provider-btn.supabase {
            background: var(--supabase);
            color: var(--supabase-text);
            border-color: var(--supabase-text);
        }

        .provider-btn.supabase:hover {
            background: var(--supabase-hover);
        }

        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid var(--border);
        }

        .footer p {
            color: var(--text-secondary);
            font-size: 14px;
        }

        .footer a {
            color: #0969da;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 32px 24px;
                margin: 16px;
            }

            .provider-btn {
                font-size: 14px;
                padding: 12px 16px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
          <img src="https://nuxt.com/assets/design-kit/icon-white.svg" alt="Nuxt Logo" />
        </div>

        <div class="header">
            <h1>Nuxt Studio</h1>
            <p>Sign in to start editing your website.</p>
        </div>

        <div class="providers">
            ${githubButton}
            ${gitlabButton}
            ${googleButton}
            ${supabaseButton}
        </div>

    </div>
</body>
</html>`
})
