// Конфигурация кубиков для каждого типа войск
export const TROOP_DICE_CONFIG = {
    troop1: 1,
    troop2: 1,
    troop3: 1,
    troop4: 0,
    troop5: 1
};

// Конфигурация жизней для каждого типа войск
export const TROOP_HEALTH_CONFIG = {
    troop1: 1,
    troop2: 2,
    troop3: 2,
    troop4: 1,
    troop5: 1
};

// Названия войск для каждой фракции
export const FACTION_TROOP_NAMES = {
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

// Командиры
export const COMMANDERS = {
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

export const COMMANDER_EXCLUSIONS = {
    atreides: [
        ['paul_atreides', 'paul_muadhib'],
        ['lady_jessica', 'reverend_mother_jessica']
    ],
    harkonnen: [
        ['beast_rabban', 'feyd_rautha']
    ]
};

// Типы войск, ограниченные лимитом 6 (поддержка troop4 не входит)
export const LIMITED_TROOP_TYPES = ['troop1', 'troop2', 'troop3', 'troop5'];

export const MAX_DICE = 6;
export const MAX_UNITS = 6;

export const DICE_FACES = {
    hit: 3,
    shield: 2,
    special: 1
};
export const TOTAL_FACES = DICE_FACES.hit + DICE_FACES.shield + DICE_FACES.special;

export function getCommanderEffectText(commander) {
    const parts = [];
    if (commander.hit > 0) parts.push(commander.hit === 1 ? '1 попадание' : commander.hit + ' попадания');
    if (commander.shield > 0) parts.push(commander.shield === 1 ? '1 защита' : commander.shield + ' защиты');
    return parts.length ? parts.join(', ') : '—';
}
