/** Where a game's thumbnail lives (public/spelen/thumbs/, 480×300): one neutral picture per game. */
export const thumbOf = (id: string) => `${import.meta.env.BASE_URL}spelen/thumbs/${id}.webp`;
