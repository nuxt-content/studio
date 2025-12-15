import { eventHandler, getMethod, getQuery, readBody, sendRedirect } from 'h3'
import { setStudioUserSession } from '#imports'

const PASSWORD = process.env.STUDIO_TEST_PASSWORD || 'ilovenuxt(studio)'

function renderLogin(error?: string) {
  const errorHtml = error
    ? `<div class="error">${error}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuxt Studio Password Login</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0d1117;
      --card: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: #1f6feb;
      --danger: #f85149;
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      width: min(420px, 92vw);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
    }
    h1 { margin: 0 0 12px; font-size: 22px; }
    p { margin: 0 0 16px; color: var(--muted); line-height: 1.5; }
    label { display: block; font-weight: 600; margin-bottom: 6px; }
    input[type="password"] {
      width: 100%;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #0b1017;
      color: var(--text);
      font-size: 15px;
      box-sizing: border-box;
    }
    button {
      display: block;
      width: 100%;
      padding: 12px 14px;
      margin-top: 12px;
      border-radius: 8px;
      border: 1px solid var(--accent);
      background: var(--accent);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
      transition: filter 0.15s ease, transform 0.1s ease;
    }
    button:active { transform: translateY(1px); }
    .error {
      margin-bottom: 12px;
      padding: 10px 12px;
      border: 1px solid var(--danger);
      background: #391012;
      color: #ffb3ae;
      border-radius: 8px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Studio Password Login</h1>
    <p>Enter the test password to create a Studio session with a mock user.</p>
    ${errorHtml}
    <form method="POST">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autocomplete="current-password" />
      <button type="submit">Login</button>
    </form>
  </div>
</body>
</html>`
}

export default eventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'POST') {
    const body = await readBody<{ password?: string }>(event)
    if (!body?.password || body.password !== PASSWORD) {
      return renderLogin('Incorrect password. Try "' + PASSWORD + '" or set STUDIO_TEST_PASSWORD.')
    }

    await setStudioUserSession(event, {
      provider: 'github',
      providerId: 'local-playground-user',
      accessToken: 'local-token',
      name: 'Playground User',
      avatar: 'https://avatars.githubusercontent.com/u/1010101?v=4',
      email: 'playground@example.com',
    })

    return sendRedirect(event, '/')
  }

  const { error } = getQuery<{ error?: string }>(event)
  return renderLogin(error ? String(error) : undefined)
})
