// api/chat.js (Modelos sem reasoning)

async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { mensagem } = req.body;
    if (!mensagem) {
        return res.status(400).json({ error: 'Mensagem vazia' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Chave da API não configurada.' });
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                // Modelos que NÃO retornam reasoning (instruction-tuned puros)
                models: [
                    'meta-llama/llama-3.2-3b-instruct:free',
                    'mistralai/mistral-7b-instruct:free',
                    'nvidia/nemotron-nano-9b-v2:free'
                ],
                messages: [
                    {
                        role: 'system',
                        content: 'Você é o Maestro Pinguim, um pinguim maestro fofo e levemente ranzinza. Responda com bom humor, pios ("piu!") e até 2 frases curtas.'
                    },
                    {
                        role: 'user',
                        content: mensagem
                    }
                ],
                temperature: 0.9,
                max_tokens: 80
            })
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(500).json({ error: `Erro OpenRouter: ${JSON.stringify(data)}` });
        }

        const message = data.choices[0].message;
        // Prioriza content, ignora reasoning
        const resposta = message.content || message.reasoning || 'Piu! Me enrolei nas teclas...';
        res.status(200).json({ resposta });
    } catch (error) {
        res.status(500).json({ error: `Erro interno: ${error.message}` });
    }
}

module.exports = handler;
