import {
    TROOP_DICE_CONFIG,
    TROOP_HEALTH_CONFIG,
    COMMANDERS,
    MAX_DICE,
    MAX_UNITS,
    LIMITED_TROOP_TYPES
} from './config.js';
import { simulateBattle, simulateSingleBattle, calculateAnalyticalExpectation } from './simulation.js';
import { createUI } from './ui.js';

function getDomRefs() {
    return {
        inputs: {
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
        },
        diceDisplays: {
            attacker: {
                total: document.getElementById('attacker-total'),
                cardDice: document.getElementById('attacker-card-dice'),
                health: document.getElementById('attacker-health')
            },
            defender: {
                total: document.getElementById('defender-total'),
                cardDice: document.getElementById('defender-card-dice'),
                settlement: document.getElementById('defender-settlement-dice'),
                health: document.getElementById('defender-health')
            }
        },
        factionSelects: {
            attacker: document.getElementById('attacker-faction'),
            defender: document.getElementById('defender-faction')
        },
        settlementSelects: {
            defender: document.getElementById('defender-settlement')
        },
        cardInputs: {
            attacker: {
                hand: document.getElementById('attacker-hand-cards'),
                discarded: document.getElementById('attacker-discarded-cards')
            },
            defender: {
                hand: document.getElementById('defender-hand-cards'),
                discarded: document.getElementById('defender-discarded-cards')
            }
        },
        commanderContainers: {
            attacker: document.getElementById('attacker-commander-options'),
            defender: document.getElementById('defender-commander-options')
        },
        troopLabels: {
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
        },
        guildUpgradeCheckboxes: {
            attacker: document.getElementById('attacker-guild-upgrade'),
            defender: document.getElementById('defender-guild-upgrade')
        },
        floatingResult: document.getElementById('floating-result'),
        floatingResultBody: document.getElementById('floating-result-body')
    };
}

const domRefs = getDomRefs();
const { inputs, factionSelects, settlementSelects, cardInputs, commanderContainers, guildUpgradeCheckboxes } = domRefs;

const isClampingRef = { current: false };

function getDefenderSettlementDice() {
    if (!settlementSelects.defender) return 0;
    return parseInt(settlementSelects.defender.value) || 0;
}

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
    if (discarded > cardDice) {
        hand += (discarded - cardDice);
        discarded = cardDice;
    }
    if (playerCards.hand.value !== String(hand)) playerCards.hand.value = hand;
    if (playerCards.discarded.value !== String(cardDice)) playerCards.discarded.value = cardDice;
    return { hand, discarded: cardDice, cardDice };
}

function getCardDiceUsed(player, baseDiceRaw) {
    const baseDiceUsed = Math.min(baseDiceRaw, MAX_DICE);
    return clampCardInputs(player, baseDiceUsed).cardDice;
}

function calculateDiceForTroopType(troopCount, dicePerTroop) {
    return troopCount * dicePerTroop;
}

function getTotalDiceRaw(player) {
    const playerInputs = inputs[player];
    let total = 0;
    total += calculateDiceForTroopType(parseInt(playerInputs.troop1.value) || 0, TROOP_DICE_CONFIG.troop1);
    total += calculateDiceForTroopType(parseInt(playerInputs.troop2.value) || 0, TROOP_DICE_CONFIG.troop2);
    total += calculateDiceForTroopType(parseInt(playerInputs.troop3.value) || 0, TROOP_DICE_CONFIG.troop3);
    total += calculateDiceForTroopType(parseInt(playerInputs.troop5.value) || 0, TROOP_DICE_CONFIG.troop5);
    if (player === 'defender') total += getDefenderSettlementDice();
    total += getCardDiceUsed(player, total);
    return total;
}

function getBaseDiceRaw(player) {
    const playerInputs = inputs[player];
    let total = 0;
    total += calculateDiceForTroopType(parseInt(playerInputs.troop1.value) || 0, TROOP_DICE_CONFIG.troop1);
    total += calculateDiceForTroopType(parseInt(playerInputs.troop2.value) || 0, TROOP_DICE_CONFIG.troop2);
    total += calculateDiceForTroopType(parseInt(playerInputs.troop3.value) || 0, TROOP_DICE_CONFIG.troop3);
    total += calculateDiceForTroopType(parseInt(playerInputs.troop5.value) || 0, TROOP_DICE_CONFIG.troop5);
    if (player === 'defender') total += getDefenderSettlementDice();
    return total;
}

function getTotalDice(player) {
    const total = getTotalDiceRaw(player);
    return total > MAX_DICE ? MAX_DICE : total;
}

function getSelectedCommanderCount(player) {
    const faction = factionSelects[player].value;
    if (!faction || !COMMANDERS[faction]) return 0;
    const container = commanderContainers[player];
    if (!container) return 0;
    const checked = container.querySelectorAll('input[name="' + player + '-commander"]:checked');
    return checked.length;
}

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

function getSpecialTroops(player) {
    return parseInt(inputs[player].troop3.value) || 0;
}

function getSelectedCommanders(player) {
    const faction = factionSelects[player].value;
    if (!faction || !COMMANDERS[faction]) return [];
    const container = commanderContainers[player];
    if (!container) return [];
    const checked = Array.from(container.querySelectorAll('input[name="' + player + '-commander"]:checked'));
    const selected = [];
    checked.forEach(input => {
        const commander = COMMANDERS[faction].find(c => c.id === input.value);
        if (commander) selected.push({ hit: commander.hit, shield: commander.shield, id: commander.id });
    });
    return selected;
}

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

const ui = createUI(domRefs);

function updateDiceDisplay(player) {
    ui.updateDiceDisplay(player, getTotalDiceRaw, getBaseDiceRaw, getTotalDice, getTotalHealth, getDefenderSettlementDice, clampCardInputs, isClampingRef);
}

function updateTroopNames(player) {
    ui.updateTroopNames(player, updateDiceDisplay);
}

function autoSelectOppositeFaction(changedPlayer) {
    const changedFaction = factionSelects[changedPlayer].value;
    const oppositePlayer = changedPlayer === 'attacker' ? 'defender' : 'attacker';
    if (changedFaction) {
        const oppositeFaction = changedFaction === 'atreides' ? 'harkonnen' : 'atreides';
        factionSelects[oppositePlayer].value = oppositeFaction;
        updateTroopNames(oppositePlayer);
    }
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

function calculateWinProbability() {
    const attackerArmy = getArmyComposition('attacker');
    const defenderArmy = getArmyComposition('defender');

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

    resetDiscardedCards('attacker');
    resetDiscardedCards('defender');
    resetSurpriseAttack();

    updateDiceDisplay('attacker');
    updateDiceDisplay('defender');

    const resultsSection = document.getElementById('battle-results');
    resultsSection.style.display = 'block';

    document.getElementById('results-details').textContent = 'Идет расчет...';
    if (domRefs.floatingResult && domRefs.floatingResultBody) {
        domRefs.floatingResultBody.textContent = 'Идет расчет...';
        domRefs.floatingResult.classList.add('show');
    }

    setTimeout(() => {
        const monteCarloResults = simulateBattle(attackerArmy, defenderArmy, 100000);
        const analyticalResults = calculateAnalyticalExpectation(attackerArmy, defenderArmy);
        ui.updateResultsDisplay(monteCarloResults, analyticalResults, attackerArmy, defenderArmy);
    }, 10);
}

function clearAllFields() {
    const resultsSection = document.getElementById('battle-results');
    if (resultsSection) resultsSection.style.display = 'none';
    const details = document.getElementById('results-details');
    if (details) details.innerHTML = '';
    const logicContent = document.getElementById('logic-content');
    if (logicContent) logicContent.innerHTML = '';
    const logicWrapper = document.getElementById('calculation-logic');
    if (logicWrapper) logicWrapper.style.display = 'none';
    if (domRefs.floatingResult) domRefs.floatingResult.classList.remove('show');

    if (factionSelects.attacker) factionSelects.attacker.value = '';
    if (factionSelects.defender) factionSelects.defender.value = '';
    if (settlementSelects.defender) settlementSelects.defender.value = '0';

    ['attacker', 'defender'].forEach(player => {
        const playerInputs = inputs[player];
        if (!playerInputs) return;
        Object.keys(playerInputs).forEach(troopType => {
            if (playerInputs[troopType]) playerInputs[troopType].value = '0';
        });
    });

    ['attacker', 'defender'].forEach(player => {
        const playerCards = cardInputs[player];
        if (!playerCards || !playerCards.hand || !playerCards.discarded) return;
        playerCards.hand.value = '0';
        playerCards.discarded.value = '0';
    });

    const surprise = document.getElementById('attacker-surprise-attack');
    if (surprise) surprise.checked = false;
    if (guildUpgradeCheckboxes.attacker) guildUpgradeCheckboxes.attacker.checked = false;
    if (guildUpgradeCheckboxes.defender) guildUpgradeCheckboxes.defender.checked = false;

    updateTroopNames('attacker');
    updateTroopNames('defender');
    updateDiceDisplay('attacker');
    updateDiceDisplay('defender');

    ['attacker', 'defender'].forEach(p => {
        const w = document.getElementById(`${p}-unit-warning`);
        if (w) w.style.display = 'none';
    });
}

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
            if (LIMITED_TROOP_TYPES.includes(troopType)) {
                const totalLimited = LIMITED_TROOP_TYPES.reduce(
                    (sum, t) => sum + (parseInt(inputs[player][t].value) || 0), 0
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
            const isDiscarded = cardId && cardId.endsWith('-discarded-cards');
            if (isDiscarded) {
                const handId = cardId.replace('-discarded-cards', '-hand-cards');
                const handInput = document.getElementById(handId);
                if (!handInput) return;
                let handValue = parseInt(handInput.value) || 0;
                let discardedValue = parseInt(input.value) || 0;
                if (action === 'increase') {
                    if (handValue <= 0) return;
                    handValue -= 1;
                    discardedValue += 1;
                } else if (action === 'decrease') {
                    if (discardedValue <= 0) return;
                    discardedValue -= 1;
                    handValue += 1;
                }
                handInput.value = handValue;
                input.value = discardedValue;
            } else {
                let currentValue = parseInt(input.value) || 0;
                if (action === 'increase') input.value = currentValue + 1;
                else if (action === 'decrease' && currentValue > 0) input.value = currentValue - 1;
            }
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
});

Object.keys(inputs.attacker).forEach(troopType => {
    inputs.attacker[troopType].addEventListener('input', () => {
        if (isClampingRef.current) return;
        updateDiceDisplay('attacker');
    });
    inputs.attacker[troopType].addEventListener('change', () => {
        if (isClampingRef.current) return;
        updateDiceDisplay('attacker');
    });
});

Object.keys(inputs.defender).forEach(troopType => {
    inputs.defender[troopType].addEventListener('input', () => {
        if (isClampingRef.current) return;
        updateDiceDisplay('defender');
    });
    inputs.defender[troopType].addEventListener('change', () => {
        if (isClampingRef.current) return;
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
            ui.applyCommanderExclusions(player, target.value);
            updateDiceDisplay(player);
        }
    });
});

factionSelects.attacker.addEventListener('change', () => {
    updateTroopNames('attacker');
    autoSelectOppositeFaction('attacker');
});

factionSelects.defender.addEventListener('change', () => {
    updateTroopNames('defender');
    autoSelectOppositeFaction('defender');
});

if (settlementSelects.defender) {
    settlementSelects.defender.addEventListener('change', () => updateDiceDisplay('defender'));
}

const surpriseAttackCheckbox = document.getElementById('attacker-surprise-attack');
if (surpriseAttackCheckbox) {
    surpriseAttackCheckbox.addEventListener('change', () => updateDiceDisplay('attacker'));
}

const calculateBtn = document.getElementById('calculate-btn');
calculateBtn.addEventListener('click', calculateWinProbability);

const floatingResultClose = document.getElementById('floating-result-close');
if (floatingResultClose && domRefs.floatingResult) {
    floatingResultClose.addEventListener('click', () => domRefs.floatingResult.classList.remove('show'));
}

const clearBtn = document.getElementById('clear-btn');
if (clearBtn) clearBtn.addEventListener('click', clearAllFields);

const logicToggle = document.getElementById('logic-toggle');
const logicBlock = document.getElementById('calculation-logic');
if (logicToggle && logicBlock) {
    logicToggle.addEventListener('click', () => {
        const expanded = logicBlock.classList.toggle('expanded');
        logicToggle.setAttribute('aria-expanded', expanded);
    });
}

updateDiceDisplay('attacker');
updateDiceDisplay('defender');
updateTroopNames('attacker');
updateTroopNames('defender');
