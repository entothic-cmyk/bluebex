export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.BOTLIY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'BOTLIY_API_KEY environment variable is not set.' });
  }

  try {
    const response = await fetch('https://botliy.online/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-v4.1',
        messages: messages || []
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}