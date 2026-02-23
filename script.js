// Конфигурация кубиков для каждого типа войск
// Каждый тип войск дает определенное количество кубиков
const TROOP_DICE_CONFIG = {
    troop1: 1,  // Войска типа 1 дают 1 кубик
    troop2: 1,  // Войска типа 2 дают 1 кубик
    troop3: 1,  // Войска типа 3 дают 1 кубик
    troop4: 0,  // Войска поддержки не дают кубики
    troop5: 1   // Войска Космической гильдии дают 1 кубик
};

// Конфигурация жизней для каждого типа войск
// Обычные: 1 жизнь; элитные/специальные: 2 жизни (1 попадание понижает до обычных, следующее убивает)
const TROOP_HEALTH_CONFIG = {
    troop1: 1,
    troop2: 2,
    troop3: 2,
    troop4: 1, // поддержка: 1 жизнь
    troop5: 1  // гильдия: 1 жизнь
};

// Названия войск для каждой фракции
const FACTION_TROOP_NAMES = {
    atreides: {
        troop1: 'Обычные',
        troop2: 'Элитные',
        troop3: 'Федайкины',
        troop4: 'Наибы',
        troop5: 'Войска Космической гильдии'
    },
    harkonnen: {
        troop1: 'Обычные',
        troop2: 'Элитные',
        troop3: 'Сардаукары',
        troop4: 'Башары',
        troop5: 'Войска Космической гильдии'
    }
};

// Командиры: за каждую специальную (⭐) грань дают попадания и/или защиты
// hit, shield — сколько добавляется за одну специальную грань
const COMMANDERS = {
    atreides: [
        { id: 'aliya', name: 'Алия', hit: 1, shield: 0 },
        { id: 'gurney', name: 'Гурни Халлек', hit: 2, shield: 1 },
        { id: 'lady_jessica', name: 'Леди Джессика', hit: 0, shield: 1 },
        { id: 'paul_atreides', name: 'Пол Атрейдес', hit: 1, shield: 0 },
        { id: 'reverend_mother_jessica', name: 'Преподобная Мать Джессика', hit: 0, shield: 2 },
        { id: 'paul_muadhib', name: 'Пол Муаддиб', hit: 2, shield: 1 },
        { id: 'stilgar', name: 'Стилгар', hit: 2, shield: 0 },
        { id: 'staban_tuek', name: 'Стабан Туек', hit: 1, shield: 1 },
        { id: 'chani', name: 'Чани', hit: 1, shield: 1 }
    ],
    harkonnen: [
        { id: 'captain_arasham', name: 'Капитан Арашам', hit: 1, shield: 1 },
        { id: 'emperor_shaddam', name: 'Император Шаддам 4', hit: 2, shield: 0 },
        { id: 'gaius_helen_mohiam', name: 'Гайя-Елена Мохийам', hit: 0, shield: 3 },
        { id: 'baron_harkonnen', name: 'Барон Харконен', hit: 0, shield: 2 },
        { id: 'beast_rabban', name: 'Зверь Раббан', hit: 2, shield: 0 },
        { id: 'feyd_rautha', name: 'Фейд Раута', hit: 2, shield: 1 },
        { id: 'thufir_havat', name: 'Суфир Хават', hit: 1, shield: 2 }
    ]
};

const COMMANDER_EXCLUSIONS = {
    atreides: [
        ['paul_atreides', 'paul_muadhib'],
        ['lady_jessica', 'reverend_mother_jessica']
    ],
    harkonnen: [
        ['beast_rabban', 'feyd_rautha']
    ]
};

function getCommanderEffectText(commander) {
    const parts = [];
    if (commander.hit > 0) parts.push(commander.hit === 1 ? '1 попадание' : commander.hit + ' попадания');
    if (commander.shield > 0) parts.push(commander.shield === 1 ? '1 защита' : commander.shield + ' защиты');
    return parts.length ? parts.join(', ') : '—';
}

// Флаг для предотвращения рекурсии при программном изменении значений
let isClamping = false;

// Получаем все элементы ввода
const inputs = {
    attacker: {
        troop1: document.getElementById('attacker-troop1'),
        troop2: document.getElementById('attacker-troop2'),
        troop3: document.getElementById('attacker-troop3'),
        troop4: document.getElementById('attacker-troop4'),
        troop5: document.getElementById('attacker-troop5')
    },
    defender: {
        troop1: document.getElementById('defender-troop1'),
        troop2: document.getElementById('defender-troop2'),
        troop3: document.getElementById('defender-troop3'),
        troop4: document.getElementById('defender-troop4'),
        troop5: document.getElementById('defender-troop5')
    }
};

// Получаем все элементы для отображения кубиков
const diceDisplays = {
    attacker: {
        dice1: document.getElementById('attacker-dice1'),
        dice2: document.getElementById('attacker-dice2'),
        dice3: document.getElementById('attacker-dice3'),
        dice4: document.getElementById('attacker-dice4'),
        dice5: document.getElementById('attacker-dice5'),
        total: document.getElementById('attacker-total'),
        cardDice: document.getElementById('attacker-card-dice'),
        health: document.getElementById('attacker-health')
    },
    defender: {
        dice1: document.getElementById('defender-dice1'),
        dice2: document.getElementById('defender-dice2'),
        dice3: document.getElementById('defender-dice3'),
        dice4: document.getElementById('defender-dice4'),
        dice5: document.getElementById('defender-dice5'),
        total: document.getElementById('defender-total'),
        cardDice: document.getElementById('defender-card-dice'),
        settlement: document.getElementById('defender-settlement-dice'),
        health: document.getElementById('defender-health')
    }
};

// Получаем элементы выбора фракций и поселений
const factionSelects = {
    attacker: document.getElementById('attacker-faction'),
    defender: document.getElementById('defender-faction')
};

const settlementSelects = {
    defender: document.getElementById('defender-settlement')
};

const floatingResult = document.getElementById('floating-result');
const floatingResultBody = document.getElementById('floating-result-body');
const floatingResultClose = document.getElementById('floating-result-close');
const clearBtn = document.getElementById('clear-btn');

const guildUpgradeCheckboxes = {
    attacker: document.getElementById('attacker-guild-upgrade'),
    defender: document.getElementById('defender-guild-upgrade')
};

const cardInputs = {
    attacker: {
        hand: document.getElementById('attacker-hand-cards'),
        discarded: document.getElementById('attacker-discarded-cards')
    },
    defender: {
        hand: document.getElementById('defender-hand-cards'),
        discarded: document.getElementById('defender-discarded-cards')
    }
};

const commanderContainers = {
    attacker: document.getElementById('attacker-commander-options'),
    defender: document.getElementById('defender-commander-options')
};

// Получаем элементы меток для названий войск
const troopLabels = {
    attacker: {
        label1: document.getElementById('attacker-label1'),
        label2: document.getElementById('attacker-label2'),
        label3: document.getElementById('attacker-label3'),
        label4: document.getElementById('attacker-label4'),
        label5: document.getElementById('attacker-label5')
    },
    defender: {
        label1: document.getElementById('defender-label1'),
        label2: document.getElementById('defender-label2'),
        label3: document.getElementById('defender-label3'),
        label4: document.getElementById('defender-label4'),
        label5: document.getElementById('defender-label5')
    }
};

// Функция для расчета кубиков для одного типа войск
function calculateDiceForTroopType(troopCount, dicePerTroop) {
    return troopCount * dicePerTroop;
}

// Максимальное количество кубиков
const MAX_DICE = 6;
// Максимальное количество юнитов на поле (ограничение по составу армии)
const MAX_UNITS = 6;

// Конфигурация кубика: 3 попадания, 2 защиты, 1 специальная
const DICE_FACES = {
    hit: 3,      // Попадания
    shield: 2,   // Защита
    special: 1   // Специальная грань
};
const TOTAL_FACES = DICE_FACES.hit + DICE_FACES.shield + DICE_FACES.special;

// Функция для получения количества кубиков от поселения защищающегося
function getDefenderSettlementDice() {
    if (!settlementSelects.defender) return 0;
    const rank = parseInt(settlementSelects.defender.value) || 0;
    return rank; // ранг 1-3 даёт 1-3 кубика
}

// Функция для проверки внезапной атаки нападающего
function getAttackerSurpriseAttack() {
    const checkbox = document.getElementById('attacker-surprise-attack');
    return checkbox ? checkbox.checked : false;
}

function getCardCounts(player) {
    const playerCards = cardInputs[player];
    if (!playerCards || !playerCards.hand || !playerCards.discarded) {
        return { hand: 0, discarded: 0 };
    }
    const hand = Math.max(0, parseInt(playerCards.hand.value) || 0);
    const discarded = Math.max(0, parseInt(playerCards.discarded.value) || 0);
    return { hand, discarded };
}

function clampCardInputs(player, baseDiceUsed) {
    const playerCards = cardInputs[player];
    if (!playerCards || !playerCards.hand || !playerCards.discarded) {
        return { hand: 0, discarded: 0, cardDice: 0 };
    }

    let { hand, discarded } = getCardCounts(player);

    const maxDiscardForDice = Math.max(0, MAX_DICE - baseDiceUsed);
    const cardDice = Math.min(discarded, maxDiscardForDice);

    // В UI "В руке" и "Сброшено" — это 2 стопки.
    // Если из-за лимита кубиков "сброшено" надо уменьшить, возвращаем лишние карты обратно "в руку".
    if (discarded > cardDice) {
        hand += (discarded - cardDice);
        discarded = cardDice;
    }

    if (playerCards.hand.value !== String(hand)) {
        playerCards.hand.value = hand;
    }
    if (playerCards.discarded.value !== String(cardDice)) {
        playerCards.discarded.value = cardDice;
    }

    return { hand, discarded: cardDice, cardDice };
}

function getCardDiceUsed(player, baseDiceRaw) {
    const baseDiceUsed = Math.min(baseDiceRaw, MAX_DICE);
    return clampCardInputs(player, baseDiceUsed).cardDice;
}

// "Сырые" кубики без учета глобального лимита 6
function getTotalDiceRaw(player) {
    const playerInputs = inputs[player];
    const dice1 = calculateDiceForTroopType(
        parseInt(playerInputs.troop1.value) || 0,
        TROOP_DICE_CONFIG.troop1
    );
    const dice2 = calculateDiceForTroopType(
        parseInt(playerInputs.troop2.value) || 0,
        TROOP_DICE_CONFIG.troop2
    );
    const dice3 = calculateDiceForTroopType(
        parseInt(playerInputs.troop3.value) || 0,
        TROOP_DICE_CONFIG.troop3
    );
    const dice5 = calculateDiceForTroopType(
        parseInt(playerInputs.troop5.value) || 0,
        TROOP_DICE_CONFIG.troop5
    );
    
    let total = dice1 + dice2 + dice3 + dice5;
    if (player === 'defender') {
        total += getDefenderSettlementDice();
    }
    total += getCardDiceUsed(player, total);
    // НЕ учитываем внезапную атаку в общем количестве кубиков (она добавляется отдельно в симуляции)
    return total;
}

function getBaseDiceRaw(player) {
    const playerInputs = inputs[player];
    const dice1 = calculateDiceForTroopType(
        parseInt(playerInputs.troop1.value) || 0,
        TROOP_DICE_CONFIG.troop1
    );
    const dice2 = calculateDiceForTroopType(
        parseInt(playerInputs.troop2.value) || 0,
        TROOP_DICE_CONFIG.troop2
    );
    const dice3 = calculateDiceForTroopType(
        parseInt(playerInputs.troop3.value) || 0,
        TROOP_DICE_CONFIG.troop3
    );
    const dice5 = calculateDiceForTroopType(
        parseInt(playerInputs.troop5.value) || 0,
        TROOP_DICE_CONFIG.troop5
    );
    let total = dice1 + dice2 + dice3 + dice5;
    if (player === 'defender') {
        total += getDefenderSettlementDice();
    }
    return total;
}

// Функция для получения общего количества кубиков игрока (включая поселение для защитника)
// но с ограничением максимум до MAX_DICE
function getTotalDice(player) {
    const total = getTotalDiceRaw(player);
    if (total > MAX_DICE) {
        return MAX_DICE;
    }
    return total;
}

// Функция для ограничения количества кубиков
function limitDice(player) {
    const totalDiceRaw = getTotalDiceRaw(player);
    const diceWarning = document.getElementById(`${player}-warning`);
    
    // Для защищающегося: просто предупреждаем, но логически режем кубики до 6
    if (player === 'defender') {
        if (diceWarning) {
            diceWarning.style.display = totalDiceRaw > MAX_DICE ? 'block' : 'none';
        }
        return;
    }

    // Для нападающего: жёсткое ограничение по вводу
    const playerInputs = inputs[player];
    if (totalDiceRaw > MAX_DICE) {
        if (diceWarning) diceWarning.style.display = 'block';
        let currentTotal = 0;
        let remaining = MAX_DICE;

        isClamping = true;
        LIMITED_TROOP_TYPES.forEach(troopType => {
            const value = parseInt(playerInputs[troopType].value) || 0;
            if (currentTotal + value > MAX_DICE) {
                playerInputs[troopType].value = Math.max(0, remaining);
            }
            currentTotal += parseInt(playerInputs[troopType].value) || 0;
            remaining = MAX_DICE - currentTotal;
        });
        setTimeout(() => { isClamping = false; }, 0);
    } else {
        if (diceWarning) diceWarning.style.display = 'none';
    }
}

// Функция для обновления отображения кубиков для одного игрока
function updateDiceDisplay(player) {
    const playerInputs = inputs[player];
    const playerDisplays = diceDisplays[player];

    // Предупреждения показываем по текущим значениям (до ограничений)
    updateDiceAndUnitWarnings(player);
    
    // Ограничиваем юниты (6 макс., поддержка не входит), затем кубики
    clampLimitedUnits(player);
    limitDice(player);
    
    // Рассчитываем кубики для каждого типа войск
    const dice1 = calculateDiceForTroopType(
        parseInt(playerInputs.troop1.value) || 0,
        TROOP_DICE_CONFIG.troop1
    );
    const dice2 = calculateDiceForTroopType(
        parseInt(playerInputs.troop2.value) || 0,
        TROOP_DICE_CONFIG.troop2
    );
    const dice3 = calculateDiceForTroopType(
        parseInt(playerInputs.troop3.value) || 0,
        TROOP_DICE_CONFIG.troop3
    );
    const dice4 = calculateDiceForTroopType(
        parseInt(playerInputs.troop4.value) || 0,
        TROOP_DICE_CONFIG.troop4
    );
    const dice5 = calculateDiceForTroopType(
        parseInt(playerInputs.troop5.value) || 0,
        TROOP_DICE_CONFIG.troop5
    );
    
    // Подписи "X кубиков" по каждому типу войск убраны из UI, поэтому обновляем только если элементы существуют
    if (playerDisplays.dice1) playerDisplays.dice1.textContent = `${dice1} ${getDiceWord(dice1)}`;
    if (playerDisplays.dice2) playerDisplays.dice2.textContent = `${dice2} ${getDiceWord(dice2)}`;
    if (playerDisplays.dice3) playerDisplays.dice3.textContent = `${dice3} ${getDiceWord(dice3)}`;
    if (playerDisplays.dice4) playerDisplays.dice4.textContent = `${dice4} ${getDiceWord(dice4)}`;
    if (playerDisplays.dice5) playerDisplays.dice5.textContent = `${dice5} ${getDiceWord(dice5)}`;
    
    // Рассчитываем и отображаем общее количество кубиков
    let totalDiceRaw = dice1 + dice2 + dice3 + dice5; // dice4 не дает кубики

    // Учитываем дополнительные кубики от поселения для защитника
    if (player === 'defender') {
        const settlementDice = getDefenderSettlementDice();
        totalDiceRaw += settlementDice;
        if (playerDisplays.settlement) {
            playerDisplays.settlement.textContent = `Поселение: ${settlementDice} ${getDiceWord(settlementDice)}`;
        }
    }

    const baseDiceUsed = Math.min(totalDiceRaw, MAX_DICE);
    const cardState = clampCardInputs(player, baseDiceUsed);
    totalDiceRaw += cardState.cardDice;
    if (playerDisplays.cardDice) {
        playerDisplays.cardDice.textContent = `Карты: в руке ${cardState.hand}, сброшено ${cardState.cardDice}`;
    }
    
    // НЕ учитываем кубик от внезапной атаки в общем количестве (он добавляется отдельно в симуляции)
    // Внезапная атака может дать до 7 кубиков, но в отображении показываем только базовые

    const totalDiceUsed = Math.min(totalDiceRaw, MAX_DICE);
    playerDisplays.total.textContent = totalDiceUsed;

    // Обновляем жизни
    if (playerDisplays.health) {
        playerDisplays.health.textContent = getTotalHealth(player);
    }
    
    // Предупреждения — в конце, чтобы не перезаписывались clampLimitedUnits/limitDice
    updateDiceAndUnitWarnings(player);
}

function updateDiceAndUnitWarnings(player) {
    const playerInputs = inputs[player];
    if (!playerInputs) return;
    
    const totalLimitedUnits = LIMITED_TROOP_TYPES.reduce(
        (sum, t) => sum + (parseInt(playerInputs[t].value) || 0), 0
    );
    const totalDiceRaw = getTotalDiceRaw(player);
    
    const diceWarning = document.getElementById(`${player}-warning`);
    const unitWarning = document.getElementById(`${player}-unit-warning`);
    
    if (diceWarning) {
        diceWarning.style.display = totalDiceRaw > MAX_DICE ? 'block' : 'none';
    }
    if (unitWarning) {
        unitWarning.style.display = totalLimitedUnits > MAX_UNITS ? 'block' : 'none';
    }
}

function getTotalUnits(player) {
    const playerInputs = inputs[player];
    if (!playerInputs) return 0;
    const troop1 = parseInt(playerInputs.troop1.value) || 0;
    const troop2 = parseInt(playerInputs.troop2.value) || 0;
    const troop3 = parseInt(playerInputs.troop3.value) || 0;
    const troop4 = parseInt(playerInputs.troop4.value) || 0;
    const troop5 = parseInt(playerInputs.troop5.value) || 0;
    return troop1 + troop2 + troop3 + troop4 + troop5;
}

// Типы войск, ограниченные лимитом 6 (поддержка troop4 не входит)
const LIMITED_TROOP_TYPES = ['troop1', 'troop2', 'troop3', 'troop5'];

function clampLimitedUnits(player, changedTroopType) {
    const playerInputs = inputs[player];
    if (!playerInputs) return;

    const unitWarning = document.getElementById(`${player}-unit-warning`);
    if (!unitWarning) return;

    const allTroopTypes = ['troop1', 'troop2', 'troop3', 'troop4', 'troop5'];
    const values = {};
    allTroopTypes.forEach(t => {
        values[t] = Math.max(0, parseInt(playerInputs[t].value) || 0);
    });

    const totalLimitedUnits = LIMITED_TROOP_TYPES.reduce((sum, t) => sum + values[t], 0);
    if (totalLimitedUnits <= MAX_UNITS) {
        unitWarning.style.display = 'none';
        allTroopTypes.forEach(t => {
            if (playerInputs[t].value !== String(values[t])) playerInputs[t].value = values[t];
        });
        return;
    }

    const excess = totalLimitedUnits - MAX_UNITS;
    const primary = changedTroopType && LIMITED_TROOP_TYPES.includes(changedTroopType) ? changedTroopType : LIMITED_TROOP_TYPES[0];
    values[primary] = Math.max(0, values[primary] - excess);
    isClamping = true;
    playerInputs[primary].value = values[primary];
    setTimeout(() => { isClamping = false; }, 0);

    unitWarning.style.display = 'block';
}

// Функция для правильного склонения слова "кубик"
function getDiceWord(count) {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return 'кубиков';
    }
    
    if (lastDigit === 1) {
        return 'кубик';
    } else if (lastDigit >= 2 && lastDigit <= 4) {
        return 'кубика';
    } else {
        return 'кубиков';
    }
}

// Функция для получения общего количества жизней войск игрока
function getTotalHealth(player) {
    const playerInputs = inputs[player];
    const troop1 = parseInt(playerInputs.troop1.value) || 0;
    const troop2 = parseInt(playerInputs.troop2.value) || 0;
    const troop3 = parseInt(playerInputs.troop3.value) || 0;
    const troop4 = parseInt(playerInputs.troop4.value) || 0;
    const troop5 = parseInt(playerInputs.troop5.value) || 0;
    const commanderCount = getSelectedCommanderCount(player);

    return (
        troop1 * TROOP_HEALTH_CONFIG.troop1 +
        troop2 * TROOP_HEALTH_CONFIG.troop2 +
        troop3 * TROOP_HEALTH_CONFIG.troop3 +
        troop4 * TROOP_HEALTH_CONFIG.troop4 +
        troop5 * TROOP_HEALTH_CONFIG.troop5 +
        commanderCount
    );
}

// Обновить список командиров при смене фракции
function updateCommanderList(player) {
    const faction = factionSelects[player].value;
    const container = commanderContainers[player];
    const wrapper = document.getElementById(player + '-commander-wrapper');
    if (!container || !wrapper) return;

    if (!faction || !COMMANDERS[faction]) {
        wrapper.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    wrapper.style.display = 'block';
    let html = '';
    COMMANDERS[faction].forEach(c => {
        const effect = getCommanderEffectText(c);
        html += '<label class="commander-option"><input type="checkbox" name="' + player + '-commander" value="' + c.id + '"> <span>' + c.name + ' — ' + effect + '</span></label>';
    });
    container.innerHTML = html;
    applyCommanderExclusions(player);
    updateDiceDisplay(player);
}

function applyCommanderExclusions(player, changedId) {
    const faction = factionSelects[player].value;
    const exclusions = COMMANDER_EXCLUSIONS[faction];
    const container = commanderContainers[player];
    if (!faction || !exclusions || !container) return;

    const inputs = Array.from(container.querySelectorAll('input[name="' + player + '-commander"]'));
    const byId = {};
    inputs.forEach(input => {
        byId[input.value] = input;
    });

    exclusions.forEach(pair => {
        const first = byId[pair[0]];
        const second = byId[pair[1]];
        if (!first || !second) return;

        if (first.checked && second.checked) {
            if (changedId === first.value) {
                second.checked = false;
            } else if (changedId === second.value) {
                first.checked = false;
            } else {
                second.checked = false;
            }
        }

        if (first.checked) {
            second.disabled = true;
            first.disabled = false;
        } else if (second.checked) {
            first.disabled = true;
            second.disabled = false;
        } else {
            first.disabled = false;
            second.disabled = false;
        }
    });
}

// Функция для обновления названий войск в зависимости от фракции
function updateTroopNames(player) {
    const faction = factionSelects[player].value;
    const labels = troopLabels[player];
    const armySection = document.querySelector(`.army-section.${player}`);
    
    // Удаляем все классы фракций
    if (armySection) {
        armySection.classList.remove('faction-atreides', 'faction-harkonnen');
    }
    
    if (faction && FACTION_TROOP_NAMES[faction]) {
        const names = FACTION_TROOP_NAMES[faction];
        labels.label1.textContent = names.troop1;
        labels.label2.textContent = names.troop2;
        labels.label3.textContent = names.troop3;
        if (labels.label4 && names.troop4) {
            labels.label4.textContent = names.troop4;
        }
        if (labels.label5 && names.troop5) {
            labels.label5.textContent = names.troop5;
        }
        
        // Добавляем класс фракции
        if (armySection) {
            armySection.classList.add(`faction-${faction}`);
        }
    } else {
        // Если фракция не выбрана, показываем общие названия
        labels.label1.textContent = 'Обычные';
        labels.label2.textContent = 'Элитные';
        labels.label3.textContent = 'Специальные';
        if (labels.label4) {
            labels.label4.textContent = 'Поддержка';
        }
        if (labels.label5) {
            labels.label5.textContent = 'Войска Космической гильдии';
        }
    }

    updateCommanderList(player);
}

// Функция для автовыбора противоположной фракции
function autoSelectOppositeFaction(changedPlayer) {
    const changedFaction = factionSelects[changedPlayer].value;
    const oppositePlayer = changedPlayer === 'attacker' ? 'defender' : 'attacker';
    
    if (changedFaction) {
        // Автоматически выбираем противоположную фракцию
        const oppositeFaction = changedFaction === 'atreides' ? 'harkonnen' : 'atreides';
        factionSelects[oppositePlayer].value = oppositeFaction;
        updateTroopNames(oppositePlayer);
    }
}

// Автоперерасчет отключен: пересчитываем только по кнопке

// Функция для форматирования результатов броска кубиков
function formatRolls(rolls) {
    const hits = rolls.filter(r => r === 'hit').length;
    const shields = rolls.filter(r => r === 'shield').length;
    const specials = rolls.filter(r => r === 'special').length;
    return `Попадания: ${hits}, Защита: ${shields}, Специальные: ${specials}`;
}

// Функция для отображения логики расчета
function displayCalculationLogic(attackerArmy, defenderArmy, exampleBattle) {
    const logicContent = document.getElementById('logic-content');
    
    const factionNames = {
        atreides: 'Атрейдесы/Фримены',
        harkonnen: 'Харконены/Коррино'
    };
    
    const attackerFaction = factionNames[factionSelects.attacker.value] || 'Неизвестно';
    const defenderFaction = factionNames[factionSelects.defender.value] || 'Неизвестно';
    const attackerSupportName = FACTION_TROOP_NAMES[factionSelects.attacker.value]?.troop4 || 'Поддержка';
    const defenderSupportName = FACTION_TROOP_NAMES[factionSelects.defender.value]?.troop4 || 'Поддержка';
    
    let html = `
        <div class="logic-section">
            <h4>Состав армий</h4>
            <div class="logic-item">
                <strong>Нападающий (${attackerFaction}):</strong> 
                Обычные: ${attackerArmy.normal}, 
                Элитные: ${attackerArmy.elite}, 
                Специальные: ${attackerArmy.special}, 
                Гильдия: ${attackerArmy.guild}, 
                ${attackerSupportName}: ${attackerArmy.support}${attackerArmy.cardDiceUsed ? `, Карты: +${attackerArmy.cardDiceUsed}` : ''} 
                (${attackerArmy.totalDice} кубиков)
            </div>
            <div class="logic-item">
                <strong>Защищающийся (${defenderFaction}):</strong> 
                Обычные: ${defenderArmy.normal}, 
                Элитные: ${defenderArmy.elite}, 
                Специальные: ${defenderArmy.special}, 
                Гильдия: ${defenderArmy.guild}, 
                ${defenderSupportName}: ${defenderArmy.support}${defenderArmy.cardDiceUsed ? `, Карты: +${defenderArmy.cardDiceUsed}` : ''} 
                (${defenderArmy.totalDice} кубиков)
            </div>
        </div>
        
        <div class="logic-section">
            <h4>Механика кубиков</h4>
            <div class="logic-item">Каждый кубик имеет 6 граней:</div>
            <div class="logic-item">• <span class="logic-highlight">3 грани</span> - попадания (⚔)</div>
            <div class="logic-item">• <span class="logic-highlight">2 грани</span> - защита (🛡)</div>
            <div class="logic-item">• <span class="logic-highlight">1 грань</span> - специальная (⭐)</div>
        </div>
        
        <div class="logic-section">
            <h4>Пример одного боя (случайный результат)</h4>
            <div class="logic-item" style="color: #e9c46a; font-style: italic; margin-bottom: 10px;">
                ⚠ Это результат одного случайного боя из 100,000 симуляций. Он может не совпадать с общей вероятностью победы.
            </div>
            <div class="logic-item">
                <strong>Бросок нападающего:</strong> ${formatRolls(exampleBattle.attackerRolls)}
            </div>
            <div class="logic-item">
                <strong>Бросок защищающегося:</strong> ${formatRolls(exampleBattle.defenderRolls)}
            </div>
            
            <div class="logic-formula">
                <div><strong>Шаг 1: Подсчет попаданий и защит</strong></div>
                <div>Нападающий:</div>
                <div>• Базовые попадания = число ⚔ в броске</div>
                <div>• Базовая защита = число 🛡 в броске</div>
                <div>• Специальные грани (⭐):</div>
                <div>  — каждая ⭐ активирует одного выбранного командира (по одной ⭐ на командира): использовано ${exampleBattle.attackerCommandersUsed} из ${exampleBattle.attackerCommandersSelected} → +${exampleBattle.attackerCommanderHits} ⚔, +${exampleBattle.attackerCommanderShields} 🛡</div>
                <div>  — оставшиеся ⭐ превращаются в попадания через ${attackerSupportName}/гильдию: ${exampleBattle.attackerSpecialsToSupport} ⭐ → ${exampleBattle.attackerSpecialsToSupport} ⚔ (лимит: ${attackerSupportName} ${exampleBattle.attackerSupport} + гильдия ${exampleBattle.attackerGuild})</div>
                <div>Итог: ${exampleBattle.attackerHits} попаданий, ${exampleBattle.attackerShields} защит</div>
                <div>Защищающийся:</div>
                <div>• Базовые попадания = число ⚔ в броске</div>
                <div>• Базовая защита = число 🛡 в броске</div>
                <div>• Специальные грани (⭐):</div>
                <div>  — каждая ⭐ активирует одного выбранного командира (по одной ⭐ на командира): использовано ${exampleBattle.defenderCommandersUsed} из ${exampleBattle.defenderCommandersSelected} → +${exampleBattle.defenderCommanderHits} ⚔, +${exampleBattle.defenderCommanderShields} 🛡</div>
                <div>  — оставшиеся ⭐ превращаются в попадания через ${defenderSupportName}/гильдию: ${exampleBattle.defenderSpecialsToSupport} ⭐ → ${exampleBattle.defenderSpecialsToSupport} ⚔ (лимит: ${defenderSupportName} ${exampleBattle.defenderSupport} + гильдия ${exampleBattle.defenderGuild})</div>
                <div>Итог: ${exampleBattle.defenderHits} попаданий, ${exampleBattle.defenderShields} защит</div>
            </div>
            
            <div class="logic-formula">
                <div><strong>Шаг 2: Отмена щитов специальными и гильдией (с прокачкой)</strong></div>
                <div>Нападающий: спец. войска ${exampleBattle.attackerSpecial} + гильдия (прокачка) ${exampleBattle.attackerGuildCancel} → отменяет ${Math.min(exampleBattle.attackerSpecial + exampleBattle.attackerGuildCancel, exampleBattle.defenderShields)} щитов защищающегося</div>
                <div>Защищающийся: спец. войска ${exampleBattle.defenderSpecial} + гильдия (прокачка) ${exampleBattle.defenderGuildCancel} → отменяет ${Math.min(exampleBattle.defenderSpecial + exampleBattle.defenderGuildCancel, exampleBattle.attackerShields)} щитов нападающего</div>
                <div>Осталось щитов у нападающего: ${exampleBattle.attackerShieldsAfterCancel}</div>
                <div>Осталось щитов у защищающегося: ${exampleBattle.defenderShieldsAfterCancel}</div>
            </div>
            
            <div class="logic-formula">
                <div><strong>Шаг 3: Расчет чистых попаданий</strong></div>
                <div>Чистые попадания нападающего = ${exampleBattle.attackerHits} - ${exampleBattle.defenderShieldsAfterCancel} = <span class="logic-highlight">${exampleBattle.attackerNetHits}</span></div>
                <div>Чистые попадания защищающегося = ${exampleBattle.defenderHits} - ${exampleBattle.attackerShieldsAfterCancel} = <span class="logic-highlight">${exampleBattle.defenderNetHits}</span></div>
            </div>
    `;
    
    logicContent.innerHTML = html;
}

// Функция для обновления отображения результатов
function updateResultsDisplay(results, analyticalResults, attackerArmy, defenderArmy) {
    const attackerFaction = factionSelects.attacker.value;
    const defenderFaction = factionSelects.defender.value;
    
    // Определяем классы фракций для результатов
    const attackerFactionClass = attackerFaction || '';
    const defenderFactionClass = defenderFaction || '';

    const attackerRangeMin = results.attackerNetHitsRange.min.toFixed(1);
    const attackerRangeMax = results.attackerNetHitsRange.max.toFixed(1);
    const attackerMean = results.averageAttackerNetHits.toFixed(1);
    const defenderRangeMin = results.defenderNetHitsRange.min.toFixed(1);
    const defenderRangeMax = results.defenderNetHitsRange.max.toFixed(1);
    const defenderMean = results.averageDefenderNetHits.toFixed(1);

    const analAttMean = analyticalResults.averageAttackerNetHits.toFixed(1);
    const analDefMean = analyticalResults.averageDefenderNetHits.toFixed(1);
    const analAttMin = analyticalResults.attackerNetHitsRange.min.toFixed(1);
    const analAttMax = analyticalResults.attackerNetHitsRange.max.toFixed(1);
    const analDefMin = analyticalResults.defenderNetHitsRange.min.toFixed(1);
    const analDefMax = analyticalResults.defenderNetHitsRange.max.toFixed(1);
    
    const detailsHtml = `
        <div class="damage-summary">
            <div class="damage-title">Диапазон нанесенного урона (чистые попадания за бой)</div>
            <div class="damage-method">Monte Carlo (100 000 итераций)</div>
            <div class="damage-row ${attackerFactionClass ? `faction-${attackerFactionClass}` : ''}">
                <span class="damage-label">Нападающий:</span>
                <span class="damage-value">${attackerRangeMin} - <span class="damage-mean">${attackerMean}</span> - ${attackerRangeMax}</span>
            </div>
            <div class="damage-row ${defenderFactionClass ? `faction-${defenderFactionClass}` : ''}">
                <span class="damage-label">Защищающийся:</span>
                <span class="damage-value">${defenderRangeMin} - <span class="damage-mean">${defenderMean}</span> - ${defenderRangeMax}</span>
            </div>
            <div class="damage-method damage-method-analytical">Аналитический расчёт (полный перебор)</div>
            <div class="damage-row ${attackerFactionClass ? `faction-${attackerFactionClass}` : ''}">
                <span class="damage-label">Нападающий:</span>
                <span class="damage-value">${analAttMin} - <span class="damage-mean">${analAttMean}</span> - ${analAttMax}</span>
            </div>
            <div class="damage-row ${defenderFactionClass ? `faction-${defenderFactionClass}` : ''}">
                <span class="damage-label">Защищающийся:</span>
                <span class="damage-value">${analDefMin} - <span class="damage-mean">${analDefMean}</span> - ${analDefMax}</span>
            </div>
        </div>
    `;

    document.getElementById('results-details').innerHTML = detailsHtml;
    
    // Показываем логику расчета с примером одного боя
    const logicWrapper = document.getElementById('calculation-logic');
    const logicContent = document.getElementById('logic-content');
    try {
        const exampleBattle = simulateSingleBattle(attackerArmy, defenderArmy);
        displayCalculationLogic(attackerArmy, defenderArmy, exampleBattle);
        if (logicWrapper) logicWrapper.style.display = 'block';
    } catch (error) {
        if (logicWrapper) logicWrapper.style.display = 'block';
        if (logicContent) {
            logicContent.textContent = `Ошибка отображения логики: ${error && error.message ? error.message : 'неизвестная ошибка'}`;
        }
    }

    showFloatingResult(results, analyticalResults);
}

function showFloatingResult(results, analyticalResults) {
    if (!floatingResult || !floatingResultBody) return;

    const attackerRangeMin = results.attackerNetHitsRange.min.toFixed(1);
    const attackerRangeMax = results.attackerNetHitsRange.max.toFixed(1);
    const attackerMean = results.averageAttackerNetHits.toFixed(1);
    const defenderRangeMin = results.defenderNetHitsRange.min.toFixed(1);
    const defenderRangeMax = results.defenderNetHitsRange.max.toFixed(1);
    const defenderMean = results.averageDefenderNetHits.toFixed(1);

    const analAttMean = analyticalResults.averageAttackerNetHits.toFixed(1);
    const analDefMean = analyticalResults.averageDefenderNetHits.toFixed(1);

    floatingResultBody.innerHTML = `
        <div class="floating-method">Monte Carlo:</div>
        <div><strong>Урон нападающего:</strong> ${attackerRangeMin} - <span class="damage-mean">${attackerMean}</span> - ${attackerRangeMax}</div>
        <div><strong>Урон защищающегося:</strong> ${defenderRangeMin} - <span class="damage-mean">${defenderMean}</span> - ${defenderRangeMax}</div>
        <div class="floating-method">Аналитический:</div>
        <div><strong>Урон нападающего:</strong> <span class="damage-mean">${analAttMean}</span></div>
        <div><strong>Урон защищающегося:</strong> <span class="damage-mean">${analDefMean}</span></div>
    `;
    floatingResult.classList.add('show');
}

// Добавляем обработчики событий для всех полей ввода
Object.keys(inputs.attacker).forEach(troopType => {
    inputs.attacker[troopType].addEventListener('input', () => {
        if (isClamping) return;
        updateDiceDisplay('attacker');
    });
    
    inputs.attacker[troopType].addEventListener('change', () => {
        if (isClamping) return;
        updateDiceDisplay('attacker');
    });
});

Object.keys(inputs.defender).forEach(troopType => {
    inputs.defender[troopType].addEventListener('input', () => {
        if (isClamping) return;
        updateDiceDisplay('defender');
    });
    
    inputs.defender[troopType].addEventListener('change', () => {
        if (isClamping) return;
        updateDiceDisplay('defender');
    });
});

Object.keys(cardInputs).forEach(player => {
    const handInput = cardInputs[player].hand;
    const discardedInput = cardInputs[player].discarded;
    if (handInput) {
        handInput.addEventListener('input', () => updateDiceDisplay(player));
        handInput.addEventListener('change', () => updateDiceDisplay(player));
    }
    if (discardedInput) {
        discardedInput.addEventListener('input', () => updateDiceDisplay(player));
        discardedInput.addEventListener('change', () => updateDiceDisplay(player));
    }
});

Object.keys(commanderContainers).forEach(player => {
    const container = commanderContainers[player];
    if (!container) return;
    container.addEventListener('change', event => {
        const target = event.target;
        if (target && target.matches('input[name="' + player + '-commander"]')) {
            applyCommanderExclusions(player, target.value);
            updateDiceDisplay(player);
        }
    });
});

// Добавляем обработчики событий для выбора фракций
factionSelects.attacker.addEventListener('change', () => {
    updateTroopNames('attacker');
    autoSelectOppositeFaction('attacker');
});

factionSelects.defender.addEventListener('change', () => {
    updateTroopNames('defender');
    autoSelectOppositeFaction('defender');
});

// Обработчик выбора поселения защищающегося
if (settlementSelects.defender) {
    settlementSelects.defender.addEventListener('change', () => {
        updateDiceDisplay('defender');
    });
}

// Обработчик внезапной атаки нападающего
const surpriseAttackCheckbox = document.getElementById('attacker-surprise-attack');
if (surpriseAttackCheckbox) {
    surpriseAttackCheckbox.addEventListener('change', () => {
        updateDiceDisplay('attacker');
    });
}

// Обработчики для кнопок изменения количества войск
document.querySelectorAll('.troop-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const troopId = btn.getAttribute('data-troop');
        const action = btn.getAttribute('data-action');
        const input = document.getElementById(troopId);
        
        if (!input) return;
        
        const player = troopId.startsWith('attacker') ? 'attacker' : 'defender';
        const troopType = troopId.replace('attacker-', '').replace('defender-', '');
        let currentValue = parseInt(input.value) || 0;
        
        if (action === 'increase') {
            // Для ограниченных типов войск — не позволяем превысить 6
            if (LIMITED_TROOP_TYPES.includes(troopType)) {
                const playerInputs = inputs[player];
                const totalLimited = LIMITED_TROOP_TYPES.reduce(
                    (sum, t) => sum + (parseInt(playerInputs[t].value) || 0), 0
                );
                if (totalLimited >= MAX_UNITS) {
                    updateDiceDisplay(player);
                    const unitWarn = document.getElementById(`${player}-unit-warning`);
                    if (unitWarn) unitWarn.style.display = 'block';
                    return;
                }
            }
            input.value = currentValue + 1;
        } else if (action === 'decrease' && currentValue > 0) {
            input.value = currentValue - 1;
        }
        
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
});

document.querySelectorAll('.card-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const cardId = btn.getAttribute('data-card');
        const action = btn.getAttribute('data-action');
        const input = document.getElementById(cardId);
        if (input) {
            let currentValue = parseInt(input.value) || 0;
            const isDiscarded = cardId && cardId.endsWith('-discarded-cards');
            if (isDiscarded) {
                const handId = cardId.replace('-discarded-cards', '-hand-cards');
                const handInput = document.getElementById(handId);
                if (!handInput) return;

                let handValue = parseInt(handInput.value) || 0;
                let discardedValue = parseInt(input.value) || 0;

                if (action === 'increase') {
                    // Переложить 1 карту из руки в сброс
                    if (handValue <= 0) return;
                    handValue -= 1;
                    discardedValue += 1;
                } else if (action === 'decrease') {
                    // Вернуть 1 карту из сброса в руку
                    if (discardedValue <= 0) return;
                    discardedValue -= 1;
                    handValue += 1;
                }

                handInput.value = handValue;
                input.value = discardedValue;
            } else {
                // Обычное поведение для "В руке": меняем только это поле
                if (action === 'increase') {
                    input.value = currentValue + 1;
                } else if (action === 'decrease' && currentValue > 0) {
                    input.value = currentValue - 1;
                }
            }
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
});

// Функция для получения количества специальных войск (федайкины/сардаукары)
function getSpecialTroops(player) {
    const faction = factionSelects[player].value;
    if (!faction) return 0;
    
    // Федайкины и сардаукары - это troop3
    return parseInt(inputs[player].troop3.value) || 0;
}

// Получить список выбранных командиров (для активации по одной ⭐ на командира)
function getSelectedCommanders(player) {
    const faction = factionSelects[player].value;
    if (!faction || !COMMANDERS[faction]) return [];
    const container = commanderContainers[player];
    if (!container) return [];
    const checked = Array.from(container.querySelectorAll('input[name="' + player + '-commander"]:checked'));
    const selected = [];
    checked.forEach(input => {
        const commander = COMMANDERS[faction].find(c => c.id === input.value);
        if (commander) {
            selected.push({ hit: commander.hit, shield: commander.shield, id: commander.id });
        }
    });
    return selected;
}

function getSelectedCommanderCount(player) {
    const faction = factionSelects[player].value;
    if (!faction || !COMMANDERS[faction]) return 0;
    const container = commanderContainers[player];
    if (!container) return 0;
    const checked = container.querySelectorAll('input[name="' + player + '-commander"]:checked');
    return checked.length;
}

// Функция для получения состава армии
function getArmyComposition(player) {
    const baseDiceRaw = getBaseDiceRaw(player);
    return {
        normal: parseInt(inputs[player].troop1.value) || 0,
        elite: parseInt(inputs[player].troop2.value) || 0,
        special: parseInt(inputs[player].troop3.value) || 0,
        support: parseInt(inputs[player].troop4.value) || 0,
        guild: parseInt(inputs[player].troop5.value) || 0,
        guildUpgraded: guildUpgradeCheckboxes[player] ? guildUpgradeCheckboxes[player].checked : false,
        totalDice: getTotalDice(player),
        cardDiceUsed: getCardDiceUsed(player, baseDiceRaw),
        specialTroops: getSpecialTroops(player),
        surpriseAttack: player === 'attacker' ? getAttackerSurpriseAttack() : false,
        commanders: getSelectedCommanders(player)
    };
}

// Распределение специальных (⭐) граней между поддержкой и командирами.
// Эффект командира можно использовать по одной ⭐ на каждого выбранного командира.
// Поддержка: каждая единица превращает одну грань в 1 попадание (до supportCount граней).
// Сначала используем ⭐ на командиров (по одной), остальные — на поддержку.
function applySpecialsOptimal(specialsCount, supportCount, commanders) {
    let hits = 0, shields = 0;
    let commanderHits = 0, commanderShields = 0, commandersUsed = 0;
    let supportHits = 0;
    if (specialsCount <= 0) {
        return {
            hits: 0,
            shields: 0,
            commandersUsed: 0,
            commanderHits: 0,
            commanderShields: 0,
            supportHits: 0
        };
    }
    let remaining = specialsCount;
    // Командиры: по одной ⭐ на каждого, выбираем самый сильный бонус первым
    if (commanders && commanders.length && remaining >= 1) {
        const ordered = [...commanders].sort((a, b) => {
            const aScore = (a.hit || 0) + (a.shield || 0);
            const bScore = (b.hit || 0) + (b.shield || 0);
            if (bScore !== aScore) return bScore - aScore;
            return (b.hit || 0) - (a.hit || 0);
        });
        const toUse = Math.min(remaining, ordered.length);
        for (let i = 0; i < toUse; i++) {
            commanderHits += ordered[i].hit || 0;
            commanderShields += ordered[i].shield || 0;
        }
        commandersUsed = toUse;
        remaining -= toUse;
    }
    // Оставшиеся грани — поддержка (1 грань → 1 попадание, не более supportCount)
    supportHits = Math.min(remaining, supportCount);
    hits += commanderHits + supportHits;
    shields += commanderShields;
    return {
        hits,
        shields,
        commandersUsed,
        commanderHits,
        commanderShields,
        supportHits
    };
}

// Функция для симуляции одного броска кубика
function rollDice() {
    const roll = Math.floor(Math.random() * TOTAL_FACES) + 1;
    if (roll <= DICE_FACES.hit) return 'hit';
    if (roll <= DICE_FACES.hit + DICE_FACES.shield) return 'shield';
    return 'special';
}

// Функция для симуляции одного примера боя (для демонстрации логики)
function simulateSingleBattle(attackerArmy, defenderArmy) {
    // Бросаем кубики
    const attackerRolls = [];
    const defenderRolls = [];
    
    // Базовые кубики нападающего
    for (let j = 0; j < attackerArmy.totalDice; j++) {
        attackerRolls.push(rollDice());
    }
    
    // Внезапная атака добавляет кубик со звездой
    if (attackerArmy.surpriseAttack) {
        attackerRolls.push('special');
    }
    
    for (let j = 0; j < defenderArmy.totalDice; j++) {
        defenderRolls.push(rollDice());
    }
    
    // Подсчитываем попадания и защиты
    let attackerHits = attackerRolls.filter(r => r === 'hit').length;
    let defenderHits = defenderRolls.filter(r => r === 'hit').length;
    let attackerShields = attackerRolls.filter(r => r === 'shield').length;
    let defenderShields = defenderRolls.filter(r => r === 'shield').length;
    let attackerSpecials = attackerRolls.filter(r => r === 'special').length;
    let defenderSpecials = defenderRolls.filter(r => r === 'special').length;

    // Специальные (⭐) грани: оптимально распределяем между поддержкой и командирами
    const attCommanders = attackerArmy.commanders || [];
    const defCommanders = defenderArmy.commanders || [];
    const attackerSupport = attackerArmy.support || 0;
    const defenderSupport = defenderArmy.support || 0;
    const attackerGuild = attackerArmy.guild || 0;
    const defenderGuild = defenderArmy.guild || 0;
    const attBonus = applySpecialsOptimal(attackerSpecials, attackerSupport + attackerGuild, attCommanders);
    const defBonus = applySpecialsOptimal(defenderSpecials, defenderSupport + defenderGuild, defCommanders);
    attackerHits += attBonus.hits;
    attackerShields += attBonus.shields;
    defenderHits += defBonus.hits;
    defenderShields += defBonus.shields;
    const attSpecialsToSupport = attBonus.supportHits || 0;
    const defSpecialsToSupport = defBonus.supportHits || 0;
    const attCommanderHits = attBonus.commanderHits || 0;
    const attCommanderShields = attBonus.commanderShields || 0;
    const defCommanderHits = defBonus.commanderHits || 0;
    const defCommanderShields = defBonus.commanderShields || 0;

    // Специальные войска отменяют щиты противника
    const attackerSpecial = attackerArmy.specialTroops;
    const defenderSpecial = defenderArmy.specialTroops;
    const attackerGuildCancel = attackerArmy.guildUpgraded ? attackerGuild : 0;
    const defenderGuildCancel = defenderArmy.guildUpgraded ? defenderGuild : 0;
    
    const originalDefenderShields = defenderShields;
    const originalAttackerShields = attackerShields;
    
    defenderShields = Math.max(0, defenderShields - attackerSpecial - attackerGuildCancel);
    attackerShields = Math.max(0, attackerShields - defenderSpecial - defenderGuildCancel);
    
    // Рассчитываем чистые попадания
    const attackerNetHits = Math.max(0, attackerHits - defenderShields);
    const defenderNetHits = Math.max(0, defenderHits - attackerShields);
    
    // Распределяем попадания по войскам
    // Попадания нападающего применяются к защищающемуся
    // Попадания защищающегося применяются к нападающему
    const attackerLosses = calculateLosses(attackerArmy, defenderNetHits);
    const defenderLosses = calculateLosses(defenderArmy, attackerNetHits);
    
    // Определяем победителя (учитываем войска поддержки в общем количестве юнитов)
    const attackerAlive = (attackerArmy.normal + attackerArmy.elite + attackerArmy.special + attackerArmy.support + attackerArmy.guild) - attackerLosses.total;
    const defenderAlive = (defenderArmy.normal + defenderArmy.elite + defenderArmy.special + defenderArmy.support + defenderArmy.guild) - defenderLosses.total;
    
    return {
        attackerRolls,
        defenderRolls,
        attackerHits,
        defenderHits,
        attackerShields: originalAttackerShields,
        defenderShields: originalDefenderShields,
        attackerSpecials,
        defenderSpecials,
        attackerSpecial,
        defenderSpecial,
        attackerGuild,
        defenderGuild,
        attackerSupport,
        defenderSupport,
        attackerCommandersSelected: attCommanders.length,
        defenderCommandersSelected: defCommanders.length,
        attackerCommandersUsed: attBonus.commandersUsed || 0,
        defenderCommandersUsed: defBonus.commandersUsed || 0,
        attackerCommanderHits: attCommanderHits,
        attackerCommanderShields: attCommanderShields,
        defenderCommanderHits: defCommanderHits,
        defenderCommanderShields: defCommanderShields,
        attackerSpecialsToSupport: attSpecialsToSupport,
        defenderSpecialsToSupport: defSpecialsToSupport,
        attackerGuildCancel,
        defenderGuildCancel,
        attackerShieldsAfterCancel: attackerShields,
        defenderShieldsAfterCancel: defenderShields,
        attackerNetHits,
        defenderNetHits,
        attackerLosses,
        defenderLosses,
        attackerAlive,
        defenderAlive,
        winner: attackerAlive > 0 && defenderAlive <= 0 ? 'attacker' : 
                defenderAlive > 0 && attackerAlive <= 0 ? 'defender' : 'draw'
    };
}

// Функция для симуляции боя
function simulateBattle(attackerArmy, defenderArmy, simulations = 10000) {
    let attackerWins = 0;
    let defenderWins = 0;
    let draws = 0;
    let totalAttackerNetHits = 0;   // суммарный урон нападающего (чистые попадания)
    let totalDefenderNetHits = 0;   // суммарный урон защищающегося (чистые попадания)
    let totalAttackerNetHitsSq = 0; // сумма квадратов для σ
    let totalDefenderNetHitsSq = 0; // сумма квадратов для σ
    
    for (let i = 0; i < simulations; i++) {
        // Бросаем кубики
        const attackerRolls = [];
        const defenderRolls = [];
        
        // Базовые кубики нападающего
        for (let j = 0; j < attackerArmy.totalDice; j++) {
            attackerRolls.push(rollDice());
        }
        
        // Внезапная атака добавляет кубик со звездой
        if (attackerArmy.surpriseAttack) {
            attackerRolls.push('special');
        }
        
        for (let j = 0; j < defenderArmy.totalDice; j++) {
            defenderRolls.push(rollDice());
        }
        
        // Подсчитываем попадания и защиты
        let attackerHits = attackerRolls.filter(r => r === 'hit').length;
        let defenderHits = defenderRolls.filter(r => r === 'hit').length;
        let attackerShields = attackerRolls.filter(r => r === 'shield').length;
        let defenderShields = defenderRolls.filter(r => r === 'shield').length;
        let attackerSpecials = attackerRolls.filter(r => r === 'special').length;
        let defenderSpecials = defenderRolls.filter(r => r === 'special').length;

        // Специальные (⭐) грани: оптимально распределяем между поддержкой и командирами
    const attCommanders = attackerArmy.commanders || [];
    const defCommanders = defenderArmy.commanders || [];
        const attackerSupport = attackerArmy.support || 0;
        const defenderSupport = defenderArmy.support || 0;
        const attackerGuild = attackerArmy.guild || 0;
        const defenderGuild = defenderArmy.guild || 0;
    const attBonus = applySpecialsOptimal(attackerSpecials, attackerSupport + attackerGuild, attCommanders);
    const defBonus = applySpecialsOptimal(defenderSpecials, defenderSupport + defenderGuild, defCommanders);
        attackerHits += attBonus.hits;
        attackerShields += attBonus.shields;
        defenderHits += defBonus.hits;
        defenderShields += defBonus.shields;

        // Специальные войска отменяют щиты противника
        const attackerSpecial = attackerArmy.specialTroops;
        const defenderSpecial = defenderArmy.specialTroops;
        const attackerGuildCancel = attackerArmy.guildUpgraded ? attackerGuild : 0;
        const defenderGuildCancel = defenderArmy.guildUpgraded ? defenderGuild : 0;
        
        defenderShields = Math.max(0, defenderShields - attackerSpecial - attackerGuildCancel);
        attackerShields = Math.max(0, attackerShields - defenderSpecial - defenderGuildCancel);
        
        // Рассчитываем чистые попадания
        const attackerNetHits = Math.max(0, attackerHits - defenderShields);
        const defenderNetHits = Math.max(0, defenderHits - attackerShields);
        
        // Распределяем попадания по войскам
        // Попадания нападающего применяются к защищающемуся
        // Попадания защищающегося применяются к нападающему
        const attackerLosses = calculateLosses(attackerArmy, defenderNetHits);
        const defenderLosses = calculateLosses(defenderArmy, attackerNetHits);
        
        // Накапливаем статистику урона (чистые попадания после учета щитов)
        totalAttackerNetHits += attackerNetHits;
        totalDefenderNetHits += defenderNetHits;
        totalAttackerNetHitsSq += attackerNetHits * attackerNetHits;
        totalDefenderNetHitsSq += defenderNetHits * defenderNetHits;
        
        // Определяем победителя (учитываем войска поддержки в общем количестве юнитов)
        const attackerAlive = (attackerArmy.normal + attackerArmy.elite + attackerArmy.special + attackerArmy.support + attackerArmy.guild) - attackerLosses.total;
        const defenderAlive = (defenderArmy.normal + defenderArmy.elite + defenderArmy.special + defenderArmy.support + defenderArmy.guild) - defenderLosses.total;
        
        if (attackerAlive > 0 && defenderAlive <= 0) {
            attackerWins++;
        } else if (defenderAlive > 0 && attackerAlive <= 0) {
            defenderWins++;
        } else {
            draws++;
        }
    }
    
    const avgAttackerNetHits = totalAttackerNetHits / simulations;
    const avgDefenderNetHits = totalDefenderNetHits / simulations;
    const attackerVar = Math.max(0, (totalAttackerNetHitsSq / simulations) - (avgAttackerNetHits * avgAttackerNetHits));
    const defenderVar = Math.max(0, (totalDefenderNetHitsSq / simulations) - (avgDefenderNetHits * avgDefenderNetHits));
    const attackerStdDev = Math.sqrt(attackerVar);
    const defenderStdDev = Math.sqrt(defenderVar);

    const attackerRangeMin = Math.max(0, avgAttackerNetHits - attackerStdDev);
    const attackerRangeMax = Math.max(0, avgAttackerNetHits + attackerStdDev);
    const defenderRangeMin = Math.max(0, avgDefenderNetHits - defenderStdDev);
    const defenderRangeMax = Math.max(0, avgDefenderNetHits + defenderStdDev);

    return {
        attackerWinRate: (attackerWins / simulations) * 100,
        defenderWinRate: (defenderWins / simulations) * 100,
        drawRate: (draws / simulations) * 100,
        averageAttackerNetHits: avgAttackerNetHits,
        averageDefenderNetHits: avgDefenderNetHits,
        attackerNetHitsRange: {
            min: Number.isFinite(attackerRangeMin) ? attackerRangeMin : 0,
            max: Number.isFinite(attackerRangeMax) ? attackerRangeMax : 0
        },
        defenderNetHitsRange: {
            min: Number.isFinite(defenderRangeMin) ? defenderRangeMin : 0,
            max: Number.isFinite(defenderRangeMax) ? defenderRangeMax : 0
        }
    };
}

// Аналитический расчёт ожидаемого урона: полный перебор мультиномиальных исходов
// Точное математическое ожидание без случайности (для сравнения с Monte Carlo)
function calculateAnalyticalExpectation(attackerArmy, defenderArmy) {
    const PH = DICE_FACES.hit / TOTAL_FACES;   // 3/6
    const PS = DICE_FACES.shield / TOTAL_FACES; // 2/6
    const PSP = DICE_FACES.special / TOTAL_FACES; // 1/6

    function factorial(n) {
        if (n <= 1) return 1;
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
    }

    function multinomialProb(n, h, s, sp) {
        if (h + s + sp !== n || h < 0 || s < 0 || sp < 0) return 0;
        const coef = factorial(n) / (factorial(h) * factorial(s) * factorial(sp));
        return coef * Math.pow(PH, h) * Math.pow(PS, s) * Math.pow(PSP, sp);
    }

    function computeNetHitsFromCounts(attH, attS, attSp, defH, defS, defSp) {
        const attCommanders = attackerArmy.commanders || [];
        const defCommanders = defenderArmy.commanders || [];
        const attackerSupport = attackerArmy.support || 0;
        const defenderSupport = defenderArmy.support || 0;
        const attackerGuild = attackerArmy.guild || 0;
        const defenderGuild = defenderArmy.guild || 0;

        const attBonus = applySpecialsOptimal(attSp, attackerSupport + attackerGuild, attCommanders);
        const defBonus = applySpecialsOptimal(defSp, defenderSupport + defenderGuild, defCommanders);

        let attackerHits = attH + attBonus.hits;
        let defenderHits = defH + defBonus.hits;
        let attackerShields = attS + attBonus.shields;
        let defenderShields = defS + defBonus.shields;

        const attackerSpecial = attackerArmy.specialTroops;
        const defenderSpecial = defenderArmy.specialTroops;
        const attackerGuildCancel = attackerArmy.guildUpgraded ? attackerGuild : 0;
        const defenderGuildCancel = defenderArmy.guildUpgraded ? defenderGuild : 0;

        defenderShields = Math.max(0, defenderShields - attackerSpecial - attackerGuildCancel);
        attackerShields = Math.max(0, attackerShields - defenderSpecial - defenderGuildCancel);

        const attackerNetHits = Math.max(0, attackerHits - defenderShields);
        const defenderNetHits = Math.max(0, defenderHits - attackerShields);
        return { attackerNetHits, defenderNetHits };
    }

    let sumAtt = 0, sumDef = 0, sumAttSq = 0, sumDefSq = 0, totalProb = 0;

    const attDice = attackerArmy.totalDice;
    const defDice = defenderArmy.totalDice;
    const attSurprise = attackerArmy.surpriseAttack || false;

    for (let attH = 0; attH <= attDice; attH++) {
        for (let attS = 0; attS <= attDice - attH; attS++) {
            const attSp = attDice - attH - attS;
            const attSpEffective = attSurprise ? attSp + 1 : attSp;
            const pAtt = multinomialProb(attDice, attH, attS, attSp);

            for (let defH = 0; defH <= defDice; defH++) {
                for (let defS = 0; defS <= defDice - defH; defS++) {
                    const defSp = defDice - defH - defS;
                    const pDef = multinomialProb(defDice, defH, defS, defSp);
                    const prob = pAtt * pDef;

                    const { attackerNetHits, defenderNetHits } = computeNetHitsFromCounts(
                        attH, attS, attSpEffective, defH, defS, defSp
                    );

                    sumAtt += prob * attackerNetHits;
                    sumDef += prob * defenderNetHits;
                    sumAttSq += prob * attackerNetHits * attackerNetHits;
                    sumDefSq += prob * defenderNetHits * defenderNetHits;
                    totalProb += prob;
                }
            }
        }
    }

    const avgAtt = totalProb > 0 ? sumAtt / totalProb : 0;
    const avgDef = totalProb > 0 ? sumDef / totalProb : 0;
    const varAtt = Math.max(0, (totalProb > 0 ? sumAttSq / totalProb : 0) - avgAtt * avgAtt);
    const varDef = Math.max(0, (totalProb > 0 ? sumDefSq / totalProb : 0) - avgDef * avgDef);
    const stdAtt = Math.sqrt(varAtt);
    const stdDef = Math.sqrt(varDef);

    return {
        averageAttackerNetHits: avgAtt,
        averageDefenderNetHits: avgDef,
        attackerNetHitsRange: {
            min: Math.max(0, avgAtt - stdAtt),
            max: avgAtt + stdAtt
        },
        defenderNetHitsRange: {
            min: Math.max(0, avgDef - stdDef),
            max: avgDef + stdDef
        }
    };
}

// Функция для расчета потерь
// Логика: обычные умирают сразу, элитные/специальные сначала превращаются в обычных
function calculateLosses(army, hits) {
    let remainingHits = hits;
    let normalLost = 0;
    let eliteLost = 0;
    let specialLost = 0;
    let supportLost = 0;
    let guildLost = 0;
    
    // Сначала попадания по обычным войскам (умирают сразу)
    normalLost = Math.min(army.normal, remainingHits);
    remainingHits -= normalLost;

    // Затем по войскам поддержки (1 жизнь)
    if (remainingHits > 0 && army.support) {
        supportLost = Math.min(army.support, remainingHits);
        remainingHits -= supportLost;
    }

    // Затем по войскам Космической гильдии (1 жизнь)
    if (remainingHits > 0 && army.guild) {
        guildLost = Math.min(army.guild, remainingHits);
        remainingHits -= guildLost;
    }
    
    // Затем попадания по элитным (превращаются в обычных)
    // Превращенные элитные становятся обычными и могут быть убиты следующими попаданиями
    let downgradedElite = 0;
    if (remainingHits > 0 && army.elite > 0) {
        downgradedElite = Math.min(army.elite, remainingHits);
        remainingHits -= downgradedElite;
    }
    
    // Затем попадания по специальным (превращаются в обычных)
    let downgradedSpecial = 0;
    if (remainingHits > 0 && army.special > 0) {
        downgradedSpecial = Math.min(army.special, remainingHits);
        remainingHits -= downgradedSpecial;
    }
    
    // Убиваем превращенных в обычных (они теперь обычные)
    const totalDowngraded = downgradedElite + downgradedSpecial;
    if (remainingHits > 0 && totalDowngraded > 0) {
        const killDowngraded = Math.min(totalDowngraded, remainingHits);
        normalLost += killDowngraded;
        remainingHits -= killDowngraded;
    }
    
    // Если еще остались попадания, убиваем оставшихся элитных
    const remainingElite = army.elite - downgradedElite;
    if (remainingHits > 0 && remainingElite > 0) {
        eliteLost = Math.min(remainingElite, remainingHits);
        remainingHits -= eliteLost;
    }
    
    // Если еще остались попадания, убиваем оставшихся специальных
    const remainingSpecial = army.special - downgradedSpecial;
    if (remainingHits > 0 && remainingSpecial > 0) {
        specialLost = Math.min(remainingSpecial, remainingHits);
    }
    
    return {
        normal: normalLost,
        elite: eliteLost,
        special: specialLost,
        support: supportLost,
        guild: guildLost,
        total: normalLost + eliteLost + specialLost + supportLost + guildLost
    };
}

// Функция для расчета и отображения вероятности победы
function calculateWinProbability() {
    const attackerArmy = getArmyComposition('attacker');
    const defenderArmy = getArmyComposition('defender');
    
    // Проверяем, что выбраны фракции и есть войска
    if (!factionSelects.attacker.value || !factionSelects.defender.value) {
        alert('Пожалуйста, выберите фракции для обоих игроков');
        return;
    }

    const attackerUnits = attackerArmy.normal + attackerArmy.elite + attackerArmy.special + attackerArmy.support + attackerArmy.guild;
    const defenderUnits = defenderArmy.normal + defenderArmy.elite + defenderArmy.special + defenderArmy.support + defenderArmy.guild;
    if (attackerUnits === 0 || defenderUnits === 0) {
        alert('Нельзя проводить бой без войск: у каждого игрока должен быть хотя бы один юнит на поле (карты не заменяют войска).');
        return;
    }
    
    if (attackerArmy.totalDice === 0 || defenderArmy.totalDice === 0) {
        alert('Оба игрока должны иметь хотя бы один источник кубиков (юниты, поселение или карты)');
        return;
    }

    // После фиксации состава армий для текущего расчета — обнуляем "Сброшено для кубиков"
    // (карты НЕ возвращаем "в руку"), чтобы следующий расчет начинался с чистого листа.
    resetDiscardedCards('attacker');
    resetDiscardedCards('defender');

    // Внезапная атака действует один раунд: после старта расчета снимаем галочку,
    // чтобы следующий расчет не был "случайно" с ней.
    resetSurpriseAttack();

    updateDiceDisplay('attacker');
    updateDiceDisplay('defender');
    
    // Показываем секцию результатов
    const resultsSection = document.getElementById('battle-results');
    resultsSection.style.display = 'block';
    
    // Показываем загрузку
    document.getElementById('results-details').textContent = 'Идет расчет...';
    if (floatingResult && floatingResultBody) {
        floatingResultBody.textContent = 'Идет расчет...';
        floatingResult.classList.add('show');
    }
    
    // Используем setTimeout для неблокирующего расчета
    setTimeout(() => {
        const monteCarloResults = simulateBattle(attackerArmy, defenderArmy, 100000);
        const analyticalResults = calculateAnalyticalExpectation(attackerArmy, defenderArmy);
        updateResultsDisplay(monteCarloResults, analyticalResults, attackerArmy, defenderArmy);
    }, 10);
}

function resetDiscardedCards(player) {
    const playerCards = cardInputs[player];
    if (!playerCards || !playerCards.hand || !playerCards.discarded) return;
    const discarded = Math.max(0, parseInt(playerCards.discarded.value) || 0);
    if (discarded <= 0) return;
    playerCards.discarded.value = '0';
}

function resetSurpriseAttack() {
    const checkbox = document.getElementById('attacker-surprise-attack');
    if (!checkbox) return;
    checkbox.checked = false;
}

// Получаем кнопку расчета
const calculateBtn = document.getElementById('calculate-btn');
calculateBtn.addEventListener('click', calculateWinProbability);
if (floatingResultClose && floatingResult) {
    floatingResultClose.addEventListener('click', () => {
        floatingResult.classList.remove('show');
    });
}

function clearAllFields() {
    // Скрываем результаты
    const resultsSection = document.getElementById('battle-results');
    if (resultsSection) resultsSection.style.display = 'none';
    const details = document.getElementById('results-details');
    if (details) details.innerHTML = '';
    const logicContent = document.getElementById('logic-content');
    if (logicContent) logicContent.innerHTML = '';
    const logicWrapper = document.getElementById('calculation-logic');
    if (logicWrapper) logicWrapper.style.display = 'none';
    if (floatingResult) floatingResult.classList.remove('show');

    // Сбрасываем фракции/поселение
    if (factionSelects.attacker) factionSelects.attacker.value = '';
    if (factionSelects.defender) factionSelects.defender.value = '';
    if (settlementSelects.defender) settlementSelects.defender.value = '0';

    // Сбрасываем юнитов
    ['attacker', 'defender'].forEach(player => {
        const playerInputs = inputs[player];
        if (!playerInputs) return;
        Object.keys(playerInputs).forEach(troopType => {
            if (playerInputs[troopType]) playerInputs[troopType].value = '0';
        });
    });

    // Сбрасываем карты
    ['attacker', 'defender'].forEach(player => {
        const playerCards = cardInputs[player];
        if (!playerCards || !playerCards.hand || !playerCards.discarded) return;
        playerCards.hand.value = '0';
        playerCards.discarded.value = '0';
    });

    // Сбрасываем чекбоксы (внезапная атака/прокачка гильдии)
    const surprise = document.getElementById('attacker-surprise-attack');
    if (surprise) surprise.checked = false;
    if (guildUpgradeCheckboxes.attacker) guildUpgradeCheckboxes.attacker.checked = false;
    if (guildUpgradeCheckboxes.defender) guildUpgradeCheckboxes.defender.checked = false;

    // Обновляем UI/командиров/названия войск
    updateTroopNames('attacker');
    updateTroopNames('defender');
    updateDiceDisplay('attacker');
    updateDiceDisplay('defender');

    // Прячем предупреждения по юнитам
    ['attacker', 'defender'].forEach(p => {
        const w = document.getElementById(`${p}-unit-warning`);
        if (w) w.style.display = 'none';
    });
}

if (clearBtn) {
    clearBtn.addEventListener('click', clearAllFields);
}

// Сворачивание/разворачивание блока «Логика расчета»
const logicToggle = document.getElementById('logic-toggle');
const logicBlock = document.getElementById('calculation-logic');
if (logicToggle && logicBlock) {
    logicToggle.addEventListener('click', () => {
        const expanded = logicBlock.classList.toggle('expanded');
        logicToggle.setAttribute('aria-expanded', expanded);
    });
}

// Инициализация при загрузке страницы
updateDiceDisplay('attacker');
updateDiceDisplay('defender');
updateTroopNames('attacker');
updateTroopNames('defender');

