// Curated real-world items per grootheid. Values are realistic so the exercise
// trains "gevoel voor maat" — the wrong units must be obviously absurd.

export interface MaatItem { sentence: string; value: number; unit: string; }

// Distractor pools per grootheid: neighbouring units on the metric ladder.
export const UNIT_POOLS: Record<string, string[]> = {
    lengte: ['mm', 'cm', 'dm', 'm', 'km'],
    massa: ['mg', 'g', 'kg', 'ton'],
    inhoud: ['ml', 'cl', 'dl', 'l'],
    tijd: ['seconden', 'minuten', 'uren', 'dagen'],
    temperatuur: ['°C'],
};

export const MAAT_ITEMS: Record<string, MaatItem[]> = {
    lengte: [
        { sentence: 'Een deur is ongeveer 2 ___ hoog.', value: 2, unit: 'm' },
        { sentence: 'Een potlood is ongeveer 18 ___ lang.', value: 18, unit: 'cm' },
        { sentence: 'Een mier is ongeveer 5 ___ lang.', value: 5, unit: 'mm' },
        { sentence: 'De afstand tussen twee steden is ongeveer 40 ___.', value: 40, unit: 'km' },
        { sentence: 'Een voetbalveld is ongeveer 100 ___ lang.', value: 100, unit: 'm' },
        { sentence: 'Een gsm is ongeveer 15 ___ lang.', value: 15, unit: 'cm' },
        { sentence: 'Een boek is ongeveer 3 ___ dik.', value: 3, unit: 'cm' },
        { sentence: 'Een muntstuk is ongeveer 2 ___ dik.', value: 2, unit: 'mm' },
        { sentence: 'Een klaslokaal is ongeveer 8 ___ breed.', value: 8, unit: 'm' },
        { sentence: 'Een fietstocht naar school is ongeveer 3 ___.', value: 3, unit: 'km' },
        { sentence: 'Een liniaal is ongeveer 30 ___ lang.', value: 30, unit: 'cm' },
        { sentence: 'Een reuzenrad is ongeveer 60 ___ hoog.', value: 60, unit: 'm' },
        { sentence: 'Een vingernagel groeit ongeveer 1 ___ per week.', value: 1, unit: 'mm' },
        { sentence: 'Een bed is ongeveer 2 ___ lang.', value: 2, unit: 'm' },
        { sentence: 'Een marathon is ongeveer 42 ___.', value: 42, unit: 'km' },
    ],
    massa: [
        { sentence: 'Een appel weegt ongeveer 180 ___.', value: 180, unit: 'g' },
        { sentence: 'Een volwassen man weegt ongeveer 80 ___.', value: 80, unit: 'kg' },
        { sentence: 'Een pak suiker weegt ongeveer 1 ___.', value: 1, unit: 'kg' },
        { sentence: 'Een auto weegt ongeveer 1,5 ___.', value: 1.5, unit: 'ton' },
        { sentence: 'Een korrel rijst weegt ongeveer 25 ___.', value: 25, unit: 'mg' },
        { sentence: 'Een ei weegt ongeveer 60 ___.', value: 60, unit: 'g' },
        { sentence: 'Een boekentas weegt ongeveer 5 ___.', value: 5, unit: 'kg' },
        { sentence: 'Een olifant weegt ongeveer 5 ___.', value: 5, unit: 'ton' },
        { sentence: 'Een brief weegt ongeveer 20 ___.', value: 20, unit: 'g' },
        { sentence: 'Een pil weegt ongeveer 500 ___.', value: 500, unit: 'mg' },
        { sentence: 'Een baby weegt ongeveer 3,5 ___.', value: 3.5, unit: 'kg' },
        { sentence: 'Een boterham weegt ongeveer 35 ___.', value: 35, unit: 'g' },
        { sentence: 'Een vrachtwagen mag maximaal 44 ___ wegen.', value: 44, unit: 'ton' },
        { sentence: 'Een banaan weegt ongeveer 120 ___.', value: 120, unit: 'g' },
        { sentence: 'Een fiets weegt ongeveer 12 ___.', value: 12, unit: 'kg' },
    ],
    inhoud: [
        { sentence: 'Een fles frisdrank bevat 1,5 ___.', value: 1.5, unit: 'l' },
        { sentence: 'Een glas water bevat ongeveer 2 ___.', value: 2, unit: 'dl' },
        { sentence: 'Een koffielepel bevat ongeveer 5 ___.', value: 5, unit: 'ml' },
        { sentence: 'Een blikje cola bevat 33 ___.', value: 33, unit: 'cl' },
        { sentence: 'Een emmer bevat ongeveer 10 ___.', value: 10, unit: 'l' },
        { sentence: 'Een brik melk bevat 1 ___.', value: 1, unit: 'l' },
        { sentence: 'Een kopje thee bevat ongeveer 15 ___.', value: 15, unit: 'cl' },
        { sentence: 'Een badkuip bevat ongeveer 150 ___.', value: 150, unit: 'l' },
        { sentence: 'Een scheutje melk in de koffie is ongeveer 10 ___.', value: 10, unit: 'ml' },
        { sentence: 'Een drinkbus bevat ongeveer 5 ___.', value: 5, unit: 'dl' },
        { sentence: 'Een aquarium bevat ongeveer 60 ___.', value: 60, unit: 'l' },
        { sentence: 'Een spuitje medicijn bevat 2 ___.', value: 2, unit: 'ml' },
    ],
    tijd: [
        { sentence: 'Tanden poetsen duurt ongeveer 3 ___.', value: 3, unit: 'minuten' },
        { sentence: 'Een nacht slapen duurt ongeveer 9 ___.', value: 9, unit: 'uren' },
        { sentence: 'Eén keer niezen duurt ongeveer 2 ___.', value: 2, unit: 'seconden' },
        { sentence: 'Een schooldag duurt ongeveer 7 ___.', value: 7, unit: 'uren' },
        { sentence: 'Een week vakantie duurt 7 ___.', value: 7, unit: 'dagen' },
        { sentence: 'Een speeltijd duurt ongeveer 15 ___.', value: 15, unit: 'minuten' },
        { sentence: 'Een voetbalmatch duurt 90 ___.', value: 90, unit: 'minuten' },
        { sentence: 'Honderd meter sprinten duurt ongeveer 15 ___.', value: 15, unit: 'seconden' },
        { sentence: 'Een vliegreis naar Spanje duurt ongeveer 2 ___.', value: 2, unit: 'uren' },
        { sentence: 'Een maand duurt ongeveer 30 ___.', value: 30, unit: 'dagen' },
    ],
    temperatuur: [
        { sentence: 'Op een warme zomerdag is het ongeveer 28 ___.', value: 28, unit: '°C' },
        { sentence: 'Water kookt bij 100 ___.', value: 100, unit: '°C' },
        { sentence: 'Water bevriest bij 0 ___.', value: 0, unit: '°C' },
        { sentence: 'Je lichaamstemperatuur is ongeveer 37 ___.', value: 37, unit: '°C' },
        { sentence: 'In de koelkast is het ongeveer 4 ___.', value: 4, unit: '°C' },
    ],
};

// Schatten variant: same items, but the pupil picks the sensible VALUE+UNIT combo
// ("180 g / 180 kg / 180 mg") — distractors are the same value with a wrong unit.
