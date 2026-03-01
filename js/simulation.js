import { resolveSingleBattle, applySpecialsOptimal } from './battleEngine.js';
import { DICE_FACES, TOTAL_FACES } from './config.js';

export function simulateBattle(attackerArmy, defenderArmy, simulations = 10000) {
    let attackerWins = 0;
    let defenderWins = 0;
    let draws = 0;
    let totalAttackerNetHits = 0;
    let totalDefenderNetHits = 0;
    let totalAttackerNetHitsSq = 0;
    let totalDefenderNetHitsSq = 0;

    for (let i = 0; i < simulations; i++) {
        const result = resolveSingleBattle(attackerArmy, defenderArmy);
        totalAttackerNetHits += result.attackerNetHits;
        totalDefenderNetHits += result.defenderNetHits;
        totalAttackerNetHitsSq += result.attackerNetHits * result.attackerNetHits;
        totalDefenderNetHitsSq += result.defenderNetHits * result.defenderNetHits;

        if (result.winner === 'attacker') attackerWins++;
        else if (result.winner === 'defender') defenderWins++;
        else draws++;
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

export function simulateSingleBattle(attackerArmy, defenderArmy) {
    return resolveSingleBattle(attackerArmy, defenderArmy);
}

export function calculateAnalyticalExpectation(attackerArmy, defenderArmy) {
    const PH = DICE_FACES.hit / TOTAL_FACES;
    const PS = DICE_FACES.shield / TOTAL_FACES;
    const PSP = DICE_FACES.special / TOTAL_FACES;

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
