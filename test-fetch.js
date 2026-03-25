const http = require('http');

http.get('http://localhost:3001/api/invoices', {
  headers: {
    'x-company-id': 'cm8mq6csq0005j81krcz2v0ve' // wait, I need a valid company ID and token...
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
}).on('error', err => console.error('Error:', err.message));
