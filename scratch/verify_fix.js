const axios = require('axios');

const API_URL = 'http://localhost:3000/api'; // Adjust if different
const COMPANY_ID = 'your-company-id'; // Need to find a real one or pass it

async function test() {
    try {
        const res = await axios.post(`${API_URL}/projects`, {
            name: 'Test Project Link',
            costCenterIds: ['some-id']
        }, {
            headers: { 'x-company-id': COMPANY_ID }
        });
        console.log('Success:', res.data);
    } catch (err) {
        console.error('Error:', err.response?.data || err.message);
    }
}

test();
