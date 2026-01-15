// proxy-server.mjs
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/exchange-token', async (req, res) => {
  try {
    const { code } = req.body;
    
    const params = new URLSearchParams();
    params.append('client_id', '04b07795-8ddb-461a-bbee-02f9e1bf7b46');
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', 'http://localhost:8400/');
    params.append('resource', 'https://storage.azure.com/');
    
    console.log('Proxying request to Microsoft...');
    console.log('Code length:', code?.length);
    
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    const responseText = await response.text();
    console.log('Microsoft response status:', response.status);
    console.log('Microsoft response:', responseText.substring(0, 400) + '...');
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      return res.status(500).json({ 
        error: 'Invalid JSON response from Microsoft',
        raw_response: responseText 
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Proxy server is running' });
});

app.listen(PORT, HOST, () => {
  console.log(`Proxy server running on http://${HOST}:${PORT}`);
});