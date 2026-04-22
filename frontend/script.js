(function(){
    "use strict";

    // ---------- CONFIGURAÇÕES ----------
    const MAX_STAT = 100;
    const MIN_STAT = 0;
    const DECAY_PER_8_HOURS = 100;     // 100 pontos a cada 8 horas
    const MS_PER_HOUR = 3600000;        // Milissegundos em 1 hora
    const DECAY_INTERVAL_MS = 300000;   // 5 minutos (para quando a página está aberta)
    const DECAY_AMOUNT = (DECAY_PER_8_HOURS / 8) * (5 / 60); // ≈ 1.04 pontos a cada 5 min

    // 🔗 LINK DA API DO CHAT (caminho relativo)
    const API_CHAT_URL = '/api/chat';

    // Estado
    let hunger = 65;
    let happiness = 55;
    let energy = 70;
    let maestroXP = 0;
    let maestroLevel = 1;
    const XP_PER_LEVEL = 100;

    // Timestamp da última atualização (para decaimento offline)
    let lastUpdateTimestamp = Date.now();

    // Elementos DOM
    const pinguimDiv = document.getElementById('pinguimSprite');
    const musicContainer = document.getElementById('musicNotesContainer');
    const hungerBar = document.getElementById('hungerBar');
    const happinessBar = document.getElementById('happinessBar');
    const energyBar = document.getElementById('energyBar');
    const hungerValue = document.getElementById('hungerValue');
    const happinessValue = document.getElementById('happinessValue');
    const energyValue = document.getElementById('energyValue');
    const messageEl = document.getElementById('messageDisplay');
    const levelDisplay = document.getElementById('levelDisplay');
    const xpBarFill = document.getElementById('xpBarFill');

    const feedBtn = document.getElementById('feedBtn');
    const playBtn = document.getElementById('playBtn');
    const sleepBtn = document.getElementById('sleepBtn');

    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatMessages = document.getElementById('chatMessages');

    let decayInterval = null;
    let actionTimer = null;

    // ---------- SALVAMENTO LOCAL (COM TIMESTAMP) ----------
    function saveGame() {
        const state = {
            hunger, happiness, energy, maestroXP, maestroLevel,
            lastUpdate: Date.now()  // Salva o momento exato da última alteração
        };
        localStorage.setItem('pinguimMaestroSave', JSON.stringify(state));
    }

    function loadGame() {
        const saved = localStorage.getItem('pinguimMaestroSave');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                hunger = s.hunger ?? 65;
                happiness = s.happiness ?? 55;
                energy = s.energy ?? 70;
                maestroXP = s.maestroXP ?? 0;
                maestroLevel = s.maestroLevel ?? 1;
                lastUpdateTimestamp = s.lastUpdate || Date.now();
                
                // Aplica o decaimento offline baseado no tempo passado
                applyOfflineDecay();
                return true;
            } catch(e) {
                console.warn('Erro ao carregar save:', e);
            }
        }
        return false;
    }

    // ---------- DECAIMENTO OFFLINE (BASEADO EM TEMPO REAL) ----------
    function applyOfflineDecay() {
        const now = Date.now();
        const elapsedMs = now - lastUpdateTimestamp;
        const elapsedHours = elapsedMs / MS_PER_HOUR;
        
        // Calcula quanto cada status deve cair (proporcional a 100 pontos / 8 horas)
        const decayPoints = (elapsedHours / 8) * DECAY_PER_8_HOURS;
        
        // Aplica o decaimento (sem nunca deixar negativo)
        hunger = Math.max(MIN_STAT, hunger - decayPoints);
        happiness = Math.max(MIN_STAT, happiness - decayPoints);
        energy = Math.max(MIN_STAT, energy - decayPoints);
        
        // Se algum status zerou, mostra mensagem de urgência
        if (hunger <= 0 || happiness <= 0 || energy <= 0) {
            messageEl.textContent = '😢 O maestro sentiu sua falta... Precisa de cuidados!';
            messageEl.classList.add('urgent-message');
        }
        
        // Atualiza o timestamp para agora
        lastUpdateTimestamp = now;
    }

    // ---------- DECAIMENTO ONLINE (ENQUANTO A PÁGINA ESTÁ ABERTA) ----------
    function decayStats() {
        hunger = Math.max(MIN_STAT, hunger - DECAY_AMOUNT);
        happiness = Math.max(MIN_STAT, happiness - DECAY_AMOUNT);
        energy = Math.max(MIN_STAT, energy - DECAY_AMOUNT);
        lastUpdateTimestamp = Date.now();
        clampStats();
        updateUI();
    }

    // ---------- ATUALIZA EXPRESSÃO DO PINGUIM ----------
    function updateSprite(forcedClass = null) {
        pinguimDiv.classList.remove('neutro', 'feliz', 'triste', 'fome', 'cansado', 'teclado', 'dormindo', 'comendo');
        
        if (forcedClass) {
            pinguimDiv.classList.add(forcedClass);
            return;
        }

        if (hunger <= MIN_STAT) {
            pinguimDiv.classList.add('fome');
        } else if (happiness <= MIN_STAT) {
            pinguimDiv.classList.add('triste');
        } else if (energy <= MIN_STAT) {
            pinguimDiv.classList.add('cansado');
        } else if (hunger < 30) {
            pinguimDiv.classList.add('fome');
        } else if (happiness < 30) {
            pinguimDiv.classList.add('triste');
        } else if (energy < 30) {
            pinguimDiv.classList.add('cansado');
        } else if (happiness > 70) {
            pinguimDiv.classList.add('feliz');
        } else {
            pinguimDiv.classList.add('neutro');
        }
    }

    // ---------- ATUALIZA TODA A UI ----------
    function updateUI() {
        hungerBar.style.width = (hunger / MAX_STAT * 100) + '%';
        happinessBar.style.width = (happiness / MAX_STAT * 100) + '%';
        energyBar.style.width = (energy / MAX_STAT * 100) + '%';
        hungerValue.textContent = Math.floor(hunger);
        happinessValue.textContent = Math.floor(happiness);
        energyValue.textContent = Math.floor(energy);

        levelDisplay.textContent = maestroLevel;
        const xpPercent = (maestroXP % XP_PER_LEVEL) / XP_PER_LEVEL * 100;
        xpBarFill.style.width = xpPercent + '%';

        feedBtn.disabled = (hunger >= MAX_STAT);
        playBtn.disabled = (happiness >= MAX_STAT);
        sleepBtn.disabled = (energy >= MAX_STAT);

        feedBtn.classList.remove('urgent');
        playBtn.classList.remove('urgent');
        sleepBtn.classList.remove('urgent');
        messageEl.classList.remove('urgent-message');

        let urgentMessage = '';

        if (hunger <= MIN_STAT) {
            urgentMessage = '🐟 Estou com muita fome! Por favor, me alimente...';
            feedBtn.classList.add('urgent');
        } else if (happiness <= MIN_STAT) {
            urgentMessage = '🎵 Estou tão triste... Vamos tocar uma música?';
            playBtn.classList.add('urgent');
        } else if (energy <= MIN_STAT) {
            urgentMessage = '🛋️ Estou exausto... Preciso descansar na poltrona.';
            sleepBtn.classList.add('urgent');
        }

        if (urgentMessage) {
            messageEl.textContent = urgentMessage;
            messageEl.classList.add('urgent-message');
        } else {
            if (hunger > 80 && happiness > 70) messageEl.textContent = '😊 Estou muito feliz e satisfeito!';
            else if (hunger < 30) messageEl.textContent = '🐟 Um peixinho cairia bem...';
            else if (happiness < 30) messageEl.textContent = '🎹 Sinto falta da música...';
            else if (energy < 30) messageEl.textContent = '😴 Uma soneca seria ótima...';
            else messageEl.textContent = '🎼 Pronto para reger uma sinfonia!';
        }

        if (!actionTimer) {
            updateSprite();
        }

        saveGame();
    }

    // ---------- SISTEMA DE XP ----------
    function addXP(amount) {
        maestroXP += amount;
        const newLevel = Math.floor(maestroXP / XP_PER_LEVEL) + 1;
        if (newLevel > maestroLevel) {
            maestroLevel = newLevel;
            messageEl.textContent = `🎉 Subiu para Nível Maestro ${maestroLevel}! 🎉`;
        }
        updateUI();
    }

    function clampStats() {
        hunger = Math.min(MAX_STAT, Math.max(MIN_STAT, hunger));
        happiness = Math.min(MAX_STAT, Math.max(MIN_STAT, happiness));
        energy = Math.min(MAX_STAT, Math.max(MIN_STAT, energy));
    }

    function setTemporarySprite(className, duration = 2000) {
        if (actionTimer) clearTimeout(actionTimer);
        updateSprite(className);
        actionTimer = setTimeout(() => {
            actionTimer = null;
            updateSprite();
        }, duration);
    }

    // ---------- AÇÕES DO JOGADOR ----------
    function feed() {
        if (hunger >= MAX_STAT) {
            messageEl.textContent = '🐟 Já estou cheio, mas obrigado!';
            return;
        }
        hunger = Math.min(MAX_STAT, hunger + 25);
        happiness = Math.min(MAX_STAT, happiness + 5);
        clampStats();
        addXP(10);
        messageEl.textContent = '🐟 Peixinho delicioso! Obrigado!';
        setTemporarySprite('comendo', 2000);
        updateUI();
    }

    function playMusic() {
        if (happiness >= MAX_STAT) {
            messageEl.textContent = '🎵 Estou tão feliz que nem preciso tocar agora!';
            return;
        }
        if (energy < 8) {
            messageEl.textContent = '😫 Muito cansado para tocar...';
            return;
        }

        musicContainer.innerHTML = '';
        const notes = ['♪', '♫', '🎵', '🎶'];
        for(let i=0; i<6; i++) {
            const note = document.createElement('span');
            note.className = 'music-note';
            note.textContent = notes[Math.floor(Math.random()*notes.length)];
            note.style.left = (i*20) + 'px';
            note.style.animationDelay = (i*0.15) + 's';
            musicContainer.appendChild(note);
            setTimeout(() => note.remove(), 1500);
        }

        happiness = Math.min(MAX_STAT, happiness + 28);
        energy = Math.max(MIN_STAT, energy - 12);
        hunger = Math.max(MIN_STAT, hunger - 6);
        clampStats();
        addXP(15);
        messageEl.textContent = '🎹 Que melodia linda! Me sinto inspirado!';
        setTemporarySprite('teclado', 2500);
        updateUI();
    }

    function sleep() {
        if (energy >= MAX_STAT) {
            messageEl.textContent = '💤 Estou descansado, não preciso dormir agora.';
            return;
        }
        energy = Math.min(MAX_STAT, energy + 35);
        hunger = Math.max(MIN_STAT, hunger - 10);
        happiness = Math.max(MIN_STAT, happiness - 2);
        clampStats();
        addXP(8);
        messageEl.textContent = '🛋️ Que cochilo gostoso na poltrona... Zzz';
        setTemporarySprite('dormindo', 3000);
        updateUI();
    }

    // ---------- CHAT COM IA (CORRIGIDO) ----------
    async function enviarMensagem() {
        const mensagem = chatInput.value.trim();
        if (!mensagem) return;

        adicionarMensagem(mensagem, 'usuario');
        chatInput.value = '';
        sendChatBtn.disabled = true;

        const digitandoDiv = adicionarMensagem('🐧 Piu... (digitando)', 'maestro');

                try {
            const response = await fetch(API_CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensagem })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro HTTP:', response.status, errorText);
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            digitandoDiv.remove();
            
            // Verificação flexível da resposta
            let respostaTexto = null;
            
            // Tenta extrair a resposta de diferentes formatos possíveis
            if (data && typeof data.resposta === 'string') {
                respostaTexto = data.resposta;
            } else if (data && data.choices && data.choices[0] && data.choices[0].message) {
                // Extrai a resposta final, ignorando pensamentos (reasoning)
                const message = data.choices[0].message;
                if (message.content && typeof message.content === 'string' && message.content.trim() !== '') {
                    respostaTexto = message.content;
                } else if (message.reasoning && typeof message.reasoning === 'string') {
                    // Se só houver reasoning, usamos ele (mas raramente é o ideal)
                    respostaTexto = message.reasoning;
                } else {
                    respostaTexto = null;
                }
            } else if (data && data.error) {
                // Se a API retornou um erro estruturado
                console.error('Erro da API:', data.error);
                respostaTexto = `🐧 Piu... ${data.error.mensagem || 'Me enrolei nas teclas'}`;
            } else {
                console.warn('Formato de resposta desconhecido:', data);
                respostaTexto = '🤔 Recebi uma resposta esquisita... Tente de novo.';
            }
            
            if (respostaTexto && respostaTexto.trim() !== '') {
                adicionarMensagem(respostaTexto, 'maestro');
                happiness = Math.min(MAX_STAT, happiness + 3);
                addXP(2);
                updateUI();
            } else {
                adicionarMensagem('🤔 Hmm, me perdi na partitura... Tente de novo.', 'maestro');
            }
        } catch (error) {
            digitandoDiv.remove();
            console.error('Erro no chat:', error);
            adicionarMensagem('❌ O maestro saiu para pescar... (erro de conexão)', 'maestro');
        } finally {
            sendChatBtn.disabled = false;
            chatInput.focus();
        }
    }

    function adicionarMensagem(texto, tipo) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('chat-message', tipo);
        msgDiv.textContent = texto;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    // ---------- INICIALIZAÇÃO ----------
    function init() {
        loadGame();
        clampStats();
        updateUI();

        feedBtn.addEventListener('click', feed);
        playBtn.addEventListener('click', playMusic);
        sleepBtn.addEventListener('click', sleep);

        if (sendChatBtn) {
            sendChatBtn.addEventListener('click', enviarMensagem);
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') enviarMensagem();
            });
        }

        if (decayInterval) clearInterval(decayInterval);
        decayInterval = setInterval(decayStats, DECAY_INTERVAL_MS);

        console.log('🐧 Pinguim Maestro carregado com sucesso!');
    }

    init();
})();
