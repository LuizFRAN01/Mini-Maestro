// api/chat.js (CommonJS com fallback de modelos)

async function handler(req, res) {
    // Configurar CORS
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
        console.error('ERRO: DEEPSEEK_API_KEY não está definida.');
        return res.status(500).json({ error: 'Chave da API não configurada no servidor.' });
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                // A MÁGICA ESTÁ AQUI: Agora usamos "models" (plural) como uma lista!
                models: [
                    'google/gemma-3-27b-it:free',
                    'meta-llama/llama-3.3-70b-instruct:free',
                    'qwen/qwen3-4b:free',
                    'nvidia/nemotron-nano-9b-v2:free'
                ],
                messages: [
                    {
                        role: 'system',
                        content: 'Você é o Maestro Pinguim, um pinguim maestro fofo, músico e levemente ranzinza. Você responde com bom humor, pios ocasionais ("piu!", "pruu!") e adora música clássica, peixes e seu cachecol listrado. Mantenha respostas curtas (até 2 frases).'
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
            console.error('Erro do OpenRouter:', data);
            return res.status(500).json({ error: `Erro da API OpenRouter: ${JSON.stringify(data)}` });
        }

        const resposta = data.choices[0].message.content;
        res.status(200).json({ resposta });
    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: `Erro interno: ${error.message}` });
    }
}

module.exports = handler;
