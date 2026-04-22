// api/chat.js (CommonJS - compatível com Vercel sem configurações extras)

async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responder imediatamente a preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Apenas POST é permitido
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // Verificar se a mensagem foi enviada
    const { mensagem } = req.body;
    if (!mensagem) {
        return res.status(400).json({ error: 'Mensagem vazia' });
    }

    // Pegar a chave da API do ambiente
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.error('ERRO: DEEPSEEK_API_KEY não está definida.');
        return res.status(500).json({ error: 'Chave da API não configurada no servidor.' });
    }

    try {
        // Chamar a API do OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.2-3b-instruct:free', // Modelo estável e gratuito
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

        // Extrair a resposta
        const resposta = data.choices[0].message.content;
        res.status(200).json({ resposta });
    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: `Erro interno: ${error.message}` });
    }
}

// Exportar no formato CommonJS (sem 'export default')
module.exports = handler;
