export class DialogueSystem {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.dialogues = [];
        this.responses = [];
        this.lastUpdateTime = 0;
        this.cooldown = 0;

        // Content Database - EXPANDED
        this.enemyNames = [
            "Бандит Джо", "Кактус Джек", "Лысый Пит", "Грязный Дэн", "Шрам", "Малой",
            "Бешеный Билл", "Одноглазый Сэм", "Рыжий", "Ковбой Мальборо", "Мясник", "Псих"
        ];

        this.phrases = {
            IDLE: [
                "Где эта сволочь прячется?",
                "Смотрите в оба, парни.",
                "Слишком тихо, бл*ть.",
                "Обосрался он, наверное.",
                "Проверь переулок, живо!",
                "Не дайте ему уйти!",
                "Я слышал какой-то шорох...",
                "Если найду его - кишки выпущу.",
                "Жарко сегодня, как в аду.",
                "Хочу текилы и бабу, а не вот это всё.",
                "Он где-то рядом, я чую.",
                "Выходите, крысы! Мы знаем, что вы здесь!",
                "Босс спустит с нас шкуру, если мы облажаемся.",
                "У него патроны не бесконечные, ждем.",
            ],
            COMBAT: [
                "Вон он! Вали гада!",
                "Жри свинец, ублюдок!",
                "Прикрой, я пустой!",
                "Сдохни, тварь, СДОХНИ!",
                "У него пушка! Атас!",
                "В башку целься, в башку!",
                "Получай, сука!",
                "Я тебя на ремни порежу!",
                "Он меня зацепил! Медика!",
                "Окружай его! Окружай!",
                "Закидывай его динамитом! (если бы он был)",
                "Да умри ты уже, живучий гад!",
                "Ща я тебе устрою дырку в голове!",
                "Грызи песок, падаль!",
            ],
            SCARED: [
                "Твою мать! Он убил Кенни!",
                "Отходим! Нас режут как свиней!",
                "Он псих еб*ный!",
                "Мама, я не хочу умирать!",
                "Откуда он стреляет?!",
                "Это дьявол во плоти!",
                "Я не подписывался на самоубийство!",
                "Бежим! Спасайся кто может!",
                "У него миниган! Мы трупы!",
                "Ноги! Делаем ноги!",
                "Господи, помилуй мою душу...",
                "Не стреляй! Я сдаюсь! (шутка, бежим!)",
            ],
            VICTORY: [
                "Ха! Готов, петушара!",
                "Не такой уж ты и крутой.",
                "Легкие бабки.",
                "Спи спокойно, урод.",
                "Кто следующий?",
                "Наконец-то. Пошли в бар.",
            ]
        };

        this.playerOptions = {
            TAUNT: [
                "Вы уже трупы, просто не знаете.",
                "Идите сюда, щенки!",
                "У меня пуля для каждого из вас.",
                "И это всё, что вы можете?",
                "Я перебью вас всех одной левой.",
                "Кто первый сдохнуть хочет? Подходи!",
                "Ваши мамы будут плакать.",
                "Слабаки. Я даже не вспотел.",
            ],
            THREAT: [
                "Кидайте пушки и бегите, суки.",
                "Я буду убивать вас медленно.",
                "Передавайте привет дьяволу.",
                "Вы на кого стволы подняли, идиоты?",
                "Живым отсюда никто не уйдет.",
                "Я сделаю из вас решето.",
                "Молитесь, грешники. Судный день настал.",
            ],
            JOKE: [
                "Классная шляпа. Сниму с трупа.",
                "Тебя мама стрелять учила?",
                "Я просто мимо проходил... за деньгами.",
                "Вы так и будете болтать или начнете стрелять?",
                "У вас там конкурс клоунов или что?",
                "Извините, здесь не подают?",
                "Слышь, ковбой, у тебя шнурок развязался.",
            ]
        };

        this.initUI();
    }

    initUI() {
        // Radio Box Container
        const container = document.createElement('div');
        container.id = 'radio-box';
        container.style.position = 'absolute';
        container.style.bottom = '20px';
        container.style.left = '20px';
        container.style.width = '400px';
        container.style.height = '300px';
        container.style.backgroundColor = 'rgba(0, 20, 0, 0.8)';
        container.style.border = '2px solid #0f0';
        container.style.boxShadow = '0 0 10px #0f0';
        container.style.borderRadius = '5px';
        container.style.fontFamily = "'Courier New', monospace";
        container.style.color = '#0f0';
        container.style.display = 'none'; // Hidden by default
        container.style.flexDirection = 'column';
        container.style.overflow = 'hidden';
        container.style.zIndex = '1500';

        // Header
        container.innerHTML = `
            <div style="background: #0f0; color: black; padding: 5px; font-weight: bold; text-align: center;">
                ПЕРЕХВАТ РАЦИИ (Закрыть: T)
            </div>
            <div id="radio-log" style="flex: 1; overflow-y: auto; padding: 10px; font-size: 14px;">
                <div style="color: #666;">Сканирую частоты... Подключено.</div>
            </div>
            <div id="radio-responses" style="border-top: 1px solid #0f0; padding: 5px; min-height: 80px;">
                <!-- Buttons go here -->
            </div>
        `;

        document.body.appendChild(container);
        this.ui = container;
        this.logEl = container.querySelector('#radio-log');
        this.responseEl = container.querySelector('#radio-responses');
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.ui.style.display = this.isOpen ? 'flex' : 'none';

        if (this.isOpen) {
            // Keep playing! Don't unlock.
            // this.game.player.controls.unlock(); 
            this.generateResponses();
            this.logEl.scrollTop = this.logEl.scrollHeight;

            // Add Key Listener
            this.keyHandler = (e) => {
                if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
                    const idx = parseInt(e.key) - 1;
                    this.triggerResponse(idx);
                }
            };
            window.addEventListener('keydown', this.keyHandler);

        } else {
            // Remove Listener
            if (this.keyHandler) {
                window.removeEventListener('keydown', this.keyHandler);
                this.keyHandler = null;
            }
        }
    }

    triggerResponse(index) {
        if (!this.currentOptions || index >= this.currentOptions.length) return;

        const opt = this.currentOptions[index];
        this.addMessage('ВЫ', opt.text, 'player');
        this.handlePlayerResponse(opt.type);
        this.generateResponses(); // Refresh options
    }

    addMessage(sender, text, type = 'enemy') {
        if (!this.logEl) return;

        const line = document.createElement('div');
        line.style.marginBottom = '4px';

        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let color = '#ff5555'; // Enemy Red
        if (type === 'player') color = '#55ffff'; // Player Cyan
        if (type === 'system') color = '#ffff55'; // System Yellow

        line.innerHTML = `<span style="color: #666;">[${time}]</span> <strong style="color: ${color};">${sender}:</strong> ${text}`;

        this.logEl.appendChild(line);
        this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    triggerEvent(event) {
        // Chance to talk
        if (Math.random() > 0.7 || event === 'DEATH') {
            const name = this.enemyNames[Math.floor(Math.random() * this.enemyNames.length)];
            let text = "";
            let type = 'IDLE';

            if (event === 'DEATH') {
                type = 'SCARED';
                text = this.phrases.SCARED[Math.floor(Math.random() * this.phrases.SCARED.length)];

                // TRIGGER FLEE BEHAVIOR
                // If they say they are scared, make a nearby enemy run away
                if (this.game.enemies && this.game.enemies.length > 0) {
                    // Pick random living enemy
                    const living = this.game.enemies.filter(e => !e.isDead);
                    if (living.length > 0 && Math.random() < 0.5) { // 50% chance to actually run if scared
                        const coward = living[Math.floor(Math.random() * living.length)];
                        coward.flee();
                    }
                }

            } else if (event === 'COMBAT') {
                type = 'COMBAT';
                text = this.phrases.COMBAT[Math.floor(Math.random() * this.phrases.COMBAT.length)];
            } else {
                text = this.phrases.IDLE[Math.floor(Math.random() * this.phrases.IDLE.length)];
            }

            this.addMessage(name, text, 'enemy');
        }
    }

    generateResponses() {
        this.responseEl.innerHTML = '';
        this.currentOptions = []; // Store for key access

        const types = ['TAUNT', 'THREAT', 'JOKE'];

        types.forEach((type, index) => {
            const list = this.playerOptions[type];
            const text = list[Math.floor(Math.random() * list.length)];

            this.currentOptions.push({ type, text });

            const btn = document.createElement('div');
            // btn.style.cursor = 'pointer'; // Not needed if mouse locked, but okay to keep
            btn.style.padding = '2px 5px';
            btn.style.border = '1px solid #0a0';
            btn.style.marginBottom = '2px';
            btn.style.fontSize = '12px';
            btn.style.color = '#afa';
            btn.innerText = `[${index + 1}] > ${text}`;

            this.responseEl.appendChild(btn);
        });
    }

    handlePlayerResponse(type) {
        setTimeout(() => {
            const name = this.enemyNames[Math.floor(Math.random() * this.enemyNames.length)];
            let reply = "";
            const r = Math.random();

            if (type === 'TAUNT') {
                if (r < 0.3) reply = "Думаешь ты смешной? Ты покойник!";
                else if (r < 0.6) reply = "Заткнись и сдохни!";
                else reply = "Сейчас мы тебе язык отрежем!";
            } else if (type === 'THREAT') {
                if (r < 0.3) reply = "Да пошел ты! Огонь по ублюдку!";
                else if (r < 0.6) reply = "Ты меня не напугаешь, щенок!";
                else reply = "Посмотрим, как ты запоешь, когда кончатся патроны!";
            } else { // JOKE
                if (r < 0.3) reply = "Чё ты там вякнул? Вали его, парни!";
                else if (r < 0.6) reply = "Очень смешно. Последняя шутка в твоей жизни.";
                else reply = "Этот идиот ещё и шутит! Кончайте его!";
            }

            this.addMessage(name, reply, 'enemy');
        }, 1000 + Math.random() * 1000);
    }
}
