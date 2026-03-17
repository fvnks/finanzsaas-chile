export const API_URL = import.meta.env.PROD
    ? '/api' // Use relative path in production since backend serves frontend
    : 'http://localhost:3001/api';
