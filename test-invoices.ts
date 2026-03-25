import http from 'http';

http.get('http://localhost:3001/api/invoices', {
  headers: {
    'x-company-id': '69624191-4bad-43bd-b1bf-967057dd7191'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Status:', res.statusCode);
      if (Array.isArray(parsed)) {
         console.log('Returned invoices:', parsed.length);
         console.log('Latest numbers:', parsed.slice(0, 5).map(i => i.number).join(', '));
      } else {
         console.log('Error payload:', parsed);
      }
    } catch(e) {
      console.log('Raw response:', data.substring(0, 200));
    }
  });
}).on('error', err => console.error('Error:', err.message));
