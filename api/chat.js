export default async function handler(req, res) {
    // Configurar CORS para permitir chamadas do seu frontend
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

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
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
        const resposta = data.choices[0].message.content;
        res.status(200).json({ resposta });
    } catch (error) {
        res.status(500).json({ error: 'Ops, o maestro se atrapalhou com a partitura.' });
    }
}