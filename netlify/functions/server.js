const { createRequestHandler } = require('@react-router/node');
const { installGlobals } = require('@remix-run/node');

// Ensure `process.env` simulates a full server environment
installGlobals();

// Remove server build requirement since it doesn't exist
// const serverBuild = require('../../build/server/index.js');

// Create a simplified handler that serves the client HTML
const handler = (request) => {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BlueAnalyze</title>
  <link rel="icon" href="/blueanalyze.png">
  <link rel="stylesheet" href="/assets/root-DcptfAQP.css">
</head>
<body>
  <div id="root"></div>
  <script>
    // Create router object to bypass SSR check
    window.__ssr_data = {
      loaderData: {},
      actionData: null,
      errors: null
    };
    window.__ssr_is_server_rendering = false;
  </script>
  <script type="module" src="/assets/manifest-bc80fecd.js"></script>
  <script type="module" src="/assets/entry.client-BrjxmDe7.js"></script>
</body>
</html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=0, must-revalidate"
      }
    }
  );
};

// Export a function for the serverless environment
exports.handler = async (event, context) => {
  try {
    // Always serve the HTML for browser requests
    const url = new URL(event.rawUrl);
    const isBrowserRequest = event.headers.accept && 
      event.headers.accept.includes('text/html') && 
      !url.pathname.startsWith('/.netlify') && 
      !url.pathname.includes('/assets/');

    if (isBrowserRequest) {
      // For browser requests, serve the static HTML
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=0, must-revalidate"
        },
        body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BlueAnalyze</title>
  <link rel="icon" href="/blueanalyze.png">
  <link rel="stylesheet" href="/assets/root-DcptfAQP.css">
</head>
<body>
  <div id="root"></div>
  <script>
    // Initialize client-side only rendering
    window.__ssr_data = {
      loaderData: {},
      actionData: null,
      errors: null
    };
    window.__ssr_is_server_rendering = false;
  </script>
  <script type="module" src="/assets/manifest-bc80fecd.js"></script>
  <script type="module" src="/assets/entry.client-BrjxmDe7.js"></script>
</body>
</html>`,
        isBase64Encoded: false
      };
    }

    // For API or asset requests, return 404 or proxy to client assets
    if (url.pathname.startsWith('/assets/')) {
      // Proxy to assets - this won't work fully but redirects user to client assets
      return {
        statusCode: 302,
        headers: {
          "Location": url.pathname
        },
        body: "",
        isBase64Encoded: false
      };
    }

    // Default 404 for API endpoints
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Not Found" }),
      headers: {
        "Content-Type": "application/json"
      },
      isBase64Encoded: false
    };
  } catch (error) {
    console.error("Server error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", message: error.message }),
      headers: {
        "Content-Type": "application/json"
      }
    };
  }
}; 