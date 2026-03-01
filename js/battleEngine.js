import { DICE_FACES, TOTAL_FACES } from './config.js';

export function rollDice() {
    const roll = Math.floor(Math.random() * TOTAL_FACES) + 1;
    if (roll <= DICE_FACES.hit) return 'hit';
    if (roll <= DICE_FACES.hit + DICE_FACES.shield) return 'shield';
    return 'special';
}

export function applySpecialsOptimal(specialsCount, supportCount, commanders) {
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

export function calculateLosses(army, hits) {
    let remainingHits = hits;
    let normalLost = 0;
    let eliteLost = 0;
    let specialLost = 0;
    let supportLost = 0;
    let guildLost = 0;

    normalLost = Math.min(army.normal, remainingHits);
    remainingHits -= normalLost;

    if (remainingHits > 0 && army.support) {
        supportLost = Math.min(army.support, remainingHits);
        remainingHits -= supportLost;
    }

    if (remainingHits > 0 && army.guild) {
        guildLost = Math.min(army.guild, remainingHits);
        remainingHits -= guildLost;
    }

    let downgradedElite = 0;
    if (remainingHits > 0 && army.elite > 0) {
        downgradedElite = Math.min(army.elite, remainingHits);
        remainingHits -= downgradedElite;
    }

    let downgradedSpecial = 0;
    if (remainingHits > 0 && army.special > 0) {
        downgradedSpecial = Math.min(army.special, remainingHits);
        remainingHits -= downgradedSpecial;
    }

    const totalDowngraded = downgradedElite + downgradedSpecial;
    if (remainingHits > 0 && totalDowngraded > 0) {
        const killDowngraded = Math.min(totalDowngraded, remainingHits);
        normalLost += killDowngraded;
        remainingHits -= killDowngraded;
    }

    const remainingElite = army.elite - downgradedElite;
    if (remainingHits > 0 && remainingElite > 0) {
        eliteLost = Math.min(remainingElite, remainingHits);
        remainingHits -= eliteLost;
    }

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

export function resolveSingleBattle(attackerArmy, defenderArmy) {
    const attackerRolls = [];
    for (let j = 0; j < attackerArmy.totalDice; j++) {
        attackerRolls.push(rollDice());
    }
    if (attackerArmy.surpriseAttack) {
        attackerRolls.push('special');
    }

    const defenderRolls = [];
    for (let j = 0; j < defenderArmy.totalDice; j++) {
        defenderRolls.push(rollDice());
    }

    let attackerHits = attackerRolls.filter(r => r === 'hit').length;
    let defenderHits = defenderRolls.filter(r => r === 'hit').length;
    let attackerShields = attackerRolls.filter(r => r === 'shield').length;
    let defenderShields = defenderRolls.filter(r => r === 'shield').length;
    let attackerSpecials = attackerRolls.filter(r => r === 'special').length;
    let defenderSpecials = defenderRolls.filter(r => r === 'special').length;

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

    const attackerSpecial = attackerArmy.specialTroops;
    const defenderSpecial = defenderArmy.specialTroops;
    const attackerGuildCancel = attackerArmy.guildUpgraded ? attackerGuild : 0;
    const defenderGuildCancel = defenderArmy.guildUpgraded ? defenderGuild : 0;

    const originalDefenderShields = defenderShields;
    const originalAttackerShields = attackerShields;

    defenderShields = Math.max(0, defenderShields - attackerSpecial - attackerGuildCancel);
    attackerShields = Math.max(0, attackerShields - defenderSpecial - defenderGuildCancel);

    const attackerNetHits = Math.max(0, attackerHits - defenderShields);
    const defenderNetHits = Math.max(0, defenderHits - attackerShields);

    const attackerLosses = calculateLosses(attackerArmy, defenderNetHits);
    const defenderLosses = calculateLosses(defenderArmy, attackerNetHits);

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
