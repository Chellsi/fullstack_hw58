import http from 'http';
import url from 'url';
import querystring from 'querystring';

// Утиліта для генерації HTML сторінок
function generateHTML(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
  </head>
  <body>
    <h1>${title}</h1>
    ${content}
  </body>
</html>`;
}

// Функція для відправки відповіді з правильними заголовками
function sendResponse(res, statusCode, html) {
  const body = Buffer.from(html, 'utf8');
  
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'X-Content-Type-Options': 'nosniff'
  });
  
  res.end(body);
}

// Обробка GET запитів
function handleGetRequest(pathname, res) {
  switch (pathname) {
    case '/':
      const homeHTML = generateHTML('Home', '<p>Welcome to the Home Page</p>');
      sendResponse(res, 200, homeHTML);
      break;
      
    case '/about':
      const aboutHTML = generateHTML('About', '<p>Learn more about us</p>');
      sendResponse(res, 200, aboutHTML);
      break;
      
    case '/contact':
      const contactHTML = generateHTML('Contact', '<p>Get in touch</p>');
      sendResponse(res, 200, contactHTML);
      break;
      
    default:
      const notFoundHTML = generateHTML('404 Not Found', '<p>Page Not Found</p>');
      sendResponse(res, 404, notFoundHTML);
      break;
  }
}

// Обробка POST запитів
function handlePostRequest(pathname, req, res) {
  if (pathname !== '/submit') {
    const notFoundHTML = generateHTML('404 Not Found', '<p>Page Not Found</p>');
    sendResponse(res, 404, notFoundHTML);
    return;
  }

  let body = '';
  
  // Збираємо дані з запиту
  req.on('data', chunk => {
    body += chunk.toString();
    
    // Захист від занадто великих запитів (макс. 1MB)
    if (body.length > 1024 * 1024) {
      const errorHTML = generateHTML('400 Bad Request', '<p>Request too large</p>');
      sendResponse(res, 400, errorHTML);
      req.destroy();
      return;
    }
  });
  
  req.on('end', () => {
    try {
      // Парсимо дані форми
      const parsedData = querystring.parse(body);
      const name = parsedData.name?.trim();
      const email = parsedData.email?.trim();
      
      // Валідація даних
      if (!name || !email) {
        const errorHTML = generateHTML('400 Bad Request', '<p>Invalid form data</p>');
        sendResponse(res, 400, errorHTML);
        return;
      }
      
      // Успішна обробка форми
      const successHTML = generateHTML(
        'Form Submitted',
        `<p>Name: ${escapeHtml(name)}</p>
         <p>Email: ${escapeHtml(email)}</p>`
      );
      sendResponse(res, 200, successHTML);
      
    } catch (error) {
      console.error('Error processing POST request:', error);
      const errorHTML = generateHTML('500 Internal Server Error', '<p>Server Error</p>');
      sendResponse(res, 500, errorHTML);
    }
  });
  
  req.on('error', (error) => {
    console.error('Request error:', error);
    const errorHTML = generateHTML('400 Bad Request', '<p>Invalid request</p>');
    sendResponse(res, 400, errorHTML);
  });
}

// Функція для екранування HTML символів (базовий захист від XSS)
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Створення сервера
const server = http.createServer((req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    console.log(`${new Date().toISOString()} - ${method} ${pathname}`);

    // Маршрутизація залежно від методу
    if (method === 'GET') {
      handleGetRequest(pathname, res);
    } else if (method === 'POST') {
      handlePostRequest(pathname, req, res);
    } else {
      // Метод не підтримується
      const errorHTML = generateHTML('405 Method Not Allowed', '<p>Method Not Allowed</p>');
      res.writeHead(405, {
        'Content-Type': 'text/html; charset=utf-8',
        'Allow': 'GET, POST',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(errorHTML);
    }
  } catch (error) {
    console.error('Unexpected server error:', error);
    
    // Перевіряємо, чи відповідь ще не була відправлена
    if (!res.headersSent) {
      const errorHTML = generateHTML('500 Internal Server Error', '<p>Server Error</p>');
      sendResponse(res, 500, errorHTML);
    }
  }
});

// Налаштування порту
const PORT = process.env.PORT || 3000;

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Available routes:');
  console.log('  GET  /        - Home page');
  console.log('  GET  /about   - About page');
  console.log('  GET  /contact - Contact page');
  console.log('  POST /submit  - Form submission');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});


export { server };
