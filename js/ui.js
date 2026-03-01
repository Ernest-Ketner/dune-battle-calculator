import {
    TROOP_DICE_CONFIG,
    FACTION_TROOP_NAMES,
    COMMANDERS,
    COMMANDER_EXCLUSIONS,
    MAX_DICE,
    MAX_UNITS,
    LIMITED_TROOP_TYPES,
    getCommanderEffectText
} from './config.js';
import { simulateSingleBattle } from './simulation.js';

function calculateDiceForTroopType(troopCount, dicePerTroop) {
    return troopCount * dicePerTroop;
}

function getDiceWord(count) {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'кубиков';
    if (lastDigit === 1) return 'кубик';
    if (lastDigit >= 2 && lastDigit <= 4) return 'кубика';
    return 'кубиков';
}

export function formatRolls(rolls) {
    const hits = rolls.filter(r => r === 'hit').length;
    const shields = rolls.filter(r => r === 'shield').length;
    const specials = rolls.filter(r => r === 'special').length;
    return `Попадания: ${hits}, Защита: ${shields}, Специальные: ${specials}`;
}

export function createUI(domRefs) {
    const {
        inputs,
        diceDisplays,
        factionSelects,
        settlementSelects,
        cardInputs,
        commanderContainers,
        troopLabels,
        guildUpgradeCheckboxes,
        floatingResult,
        floatingResultBody
    } = domRefs;

    function updateDiceAndUnitWarnings(player, getTotalDiceRaw, getDomRefs) {
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

    function clampLimitedUnits(player, getTotalDiceRaw, isClampingRef, changedTroopType) {
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
        isClampingRef.current = true;
        playerInputs[primary].value = values[primary];
        setTimeout(() => { isClampingRef.current = false; }, 0);
        unitWarning.style.display = 'block';
    }

    function limitDice(player, getTotalDiceRaw, clampCardInputs, isClampingRef) {
        const totalDiceRaw = getTotalDiceRaw(player);
        const diceWarning = document.getElementById(`${player}-warning`);

        if (player === 'defender') {
            if (diceWarning) {
                diceWarning.style.display = totalDiceRaw > MAX_DICE ? 'block' : 'none';
            }
            return;
        }

        const playerInputs = inputs[player];
        if (totalDiceRaw > MAX_DICE) {
            if (diceWarning) diceWarning.style.display = 'block';
            let currentTotal = 0;
            let remaining = MAX_DICE;

            isClampingRef.current = true;
            LIMITED_TROOP_TYPES.forEach(troopType => {
                const value = parseInt(playerInputs[troopType].value) || 0;
                if (currentTotal + value > MAX_DICE) {
                    playerInputs[troopType].value = Math.max(0, remaining);
                }
                currentTotal += parseInt(playerInputs[troopType].value) || 0;
                remaining = MAX_DICE - currentTotal;
            });
            setTimeout(() => { isClampingRef.current = false; }, 0);
        } else {
            if (diceWarning) diceWarning.style.display = 'none';
        }
    }

    return {
        updateDiceDisplay(player, getTotalDiceRaw, getBaseDiceRaw, getTotalDice, getTotalHealth, getDefenderSettlementDice, clampCardInputs, isClampingRef) {
            const playerInputs = inputs[player];
            const playerDisplays = diceDisplays[player];

            updateDiceAndUnitWarnings(player, getTotalDiceRaw);
            clampLimitedUnits(player, getTotalDiceRaw, isClampingRef);
            limitDice(player, getTotalDiceRaw, clampCardInputs, isClampingRef);

            const dice1 = calculateDiceForTroopType(parseInt(playerInputs.troop1.value) || 0, TROOP_DICE_CONFIG.troop1);
            const dice2 = calculateDiceForTroopType(parseInt(playerInputs.troop2.value) || 0, TROOP_DICE_CONFIG.troop2);
            const dice3 = calculateDiceForTroopType(parseInt(playerInputs.troop3.value) || 0, TROOP_DICE_CONFIG.troop3);
            const dice5 = calculateDiceForTroopType(parseInt(playerInputs.troop5.value) || 0, TROOP_DICE_CONFIG.troop5);

            let totalDiceRaw = dice1 + dice2 + dice3 + dice5;

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

            const totalDiceUsed = Math.min(totalDiceRaw, MAX_DICE);
            playerDisplays.total.textContent = totalDiceUsed;

            if (playerDisplays.health) {
                playerDisplays.health.textContent = getTotalHealth(player);
            }

            updateDiceAndUnitWarnings(player, getTotalDiceRaw);
        },

        updateCommanderList(player, updateDiceDisplayFn) {
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
            this.applyCommanderExclusions(player);
            if (updateDiceDisplayFn) updateDiceDisplayFn(player);
        },

        applyCommanderExclusions(player, changedId) {
            const faction = factionSelects[player].value;
            const exclusions = COMMANDER_EXCLUSIONS[faction];
            const container = commanderContainers[player];
            if (!faction || !exclusions || !container) return;

            const checkboxes = Array.from(container.querySelectorAll('input[name="' + player + '-commander"]'));
            const byId = {};
            checkboxes.forEach(input => { byId[input.value] = input; });

            exclusions.forEach(pair => {
                const first = byId[pair[0]];
                const second = byId[pair[1]];
                if (!first || !second) return;

                if (first.checked && second.checked) {
                    if (changedId === first.value) second.checked = false;
                    else if (changedId === second.value) first.checked = false;
                    else second.checked = false;
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
        },

        updateTroopNames(player, updateDiceDisplayFn) {
            const faction = factionSelects[player].value;
            const labels = troopLabels[player];
            const armySection = document.querySelector(`.army-section.${player}`);

            if (armySection) {
                armySection.classList.remove('faction-atreides', 'faction-harkonnen');
            }

            if (faction && FACTION_TROOP_NAMES[faction]) {
                const names = FACTION_TROOP_NAMES[faction];
                labels.label1.textContent = names.troop1;
                labels.label2.textContent = names.troop2;
                labels.label3.textContent = names.troop3;
                if (labels.label4 && names.troop4) labels.label4.textContent = names.troop4;
                if (labels.label5 && names.troop5) labels.label5.textContent = names.troop5;
                if (armySection) armySection.classList.add(`faction-${faction}`);
            } else {
                labels.label1.textContent = 'Обычные';
                labels.label2.textContent = 'Элитные';
                labels.label3.textContent = 'Специальные';
                if (labels.label4) labels.label4.textContent = 'Поддержка';
                if (labels.label5) labels.label5.textContent = 'Войска Космической гильдии';
            }

            this.updateCommanderList(player, updateDiceDisplayFn);
        },

        displayCalculationLogic(attackerArmy, defenderArmy, exampleBattle) {
            const logicContent = document.getElementById('logic-content');
            const factionNames = { atreides: 'Атрейдесы/Фримены', harkonnen: 'Харконены/Коррино' };
            const attackerFaction = factionNames[factionSelects.attacker.value] || 'Неизвестно';
            const defenderFaction = factionNames[factionSelects.defender.value] || 'Неизвестно';
            const attackerSupportName = FACTION_TROOP_NAMES[factionSelects.attacker.value]?.troop4 || 'Поддержка';
            const defenderSupportName = FACTION_TROOP_NAMES[factionSelects.defender.value]?.troop4 || 'Поддержка';

            const html = `
        <div class="logic-section">
            <h4>Состав армий</h4>
            <div class="logic-item">
                <strong>Нападающий (${attackerFaction}):</strong> 
                Обычные: ${attackerArmy.normal}, Элитные: ${attackerArmy.elite}, Специальные: ${attackerArmy.special}, 
                Гильдия: ${attackerArmy.guild}, ${attackerSupportName}: ${attackerArmy.support}${attackerArmy.cardDiceUsed ? `, Карты: +${attackerArmy.cardDiceUsed}` : ''} 
                (${attackerArmy.totalDice} кубиков)
            </div>
            <div class="logic-item">
                <strong>Защищающийся (${defenderFaction}):</strong> 
                Обычные: ${defenderArmy.normal}, Элитные: ${defenderArmy.elite}, Специальные: ${defenderArmy.special}, 
                Гильдия: ${defenderArmy.guild}, ${defenderSupportName}: ${defenderArmy.support}${defenderArmy.cardDiceUsed ? `, Карты: +${defenderArmy.cardDiceUsed}` : ''} 
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
            <div class="logic-item"><strong>Бросок нападающего:</strong> ${formatRolls(exampleBattle.attackerRolls)}</div>
            <div class="logic-item"><strong>Бросок защищающегося:</strong> ${formatRolls(exampleBattle.defenderRolls)}</div>
            <div class="logic-formula">
                <div><strong>Шаг 1: Подсчет попаданий и защит</strong></div>
                <div>Нападающий:</div>
                <div>• Базовые попадания = число ⚔ в броске</div>
                <div>• Базовая защита = число 🛡 в броске</div>
                <div>• Специальные грани (⭐):</div>
                <div>  — каждая ⭐ активирует одного выбранного командира (по одной ⭐ на командира): использовано ${exampleBattle.attackerCommandersUsed} из ${exampleBattle.attackerCommandersSelected} → +${exampleBattle.attackerCommanderHits} ⚔, +${exampleBattle.attackerCommanderShields} 🛡</div>
                <div>  — оставшиеся ⭐ превращаются в попадания через ${attackerSupportName}/гильдию: ${exampleBattle.attackerSpecialsToSupport} ⭐ → ${exampleBattle.attackerSpecialsToSupport} ⚔ (лимит: ${attackerSupportName} ${exampleBattle.attackerSupport} + гильдия ${exampleBattle.attackerGuild})</div>
                <div>Итог: ${exampleBattle.attackerHits} попаданий, ${exampleBattle.attackerShields} защит</div>
                <div>Защищающийся:</div>
                <div>• Базовые попадания = число ⚔ в броске</div>
                <div>• Базовая защита = число 🛡 в броске</div>
                <div>• Специальные грани (⭐):</div>
                <div>  — каждая ⭐ активирует одного выбранного командира (по одной ⭐ на командира): использовано ${exampleBattle.defenderCommandersUsed} из ${exampleBattle.defenderCommandersSelected} → +${exampleBattle.defenderCommanderHits} ⚔, +${exampleBattle.defenderCommanderShields} 🛡</div>
                <div>  — оставшиеся ⭐ превращаются в попадания через ${defenderSupportName}/гильдию: ${exampleBattle.defenderSpecialsToSupport} ⭐ → ${exampleBattle.defenderSpecialsToSupport} ⚔ (лимит: ${defenderSupportName} ${exampleBattle.defenderSupport} + гильдия ${exampleBattle.defenderGuild})</div>
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
        },

        updateResultsDisplay(results, analyticalResults, attackerArmy, defenderArmy) {
            const attackerFaction = factionSelects.attacker.value;
            const defenderFaction = factionSelects.defender.value;
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

            const logicWrapper = document.getElementById('calculation-logic');
            const logicContent = document.getElementById('logic-content');
            try {
                const exampleBattle = simulateSingleBattle(attackerArmy, defenderArmy);
                this.displayCalculationLogic(attackerArmy, defenderArmy, exampleBattle);
                if (logicWrapper) logicWrapper.style.display = 'block';
            } catch (error) {
                if (logicWrapper) logicWrapper.style.display = 'block';
                if (logicContent) {
                    logicContent.textContent = `Ошибка отображения логики: ${error && error.message ? error.message : 'неизвестная ошибка'}`;
                }
            }

            this.showFloatingResult(results, analyticalResults);
        },

        showFloatingResult(results, analyticalResults) {
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
    };
}
