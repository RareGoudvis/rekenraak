import { EENVOUDIG_NAV } from '../../config/eenvoudig/nav';

// The domain colour a topic's cards and rows carry (the same hue family as the Uitgebreid tree).
export const accentOf = (topicId: string): string =>
    EENVOUDIG_NAV.find(s => s.topics.some(t => t.id === topicId))?.accent ?? 'bewerkingen';
