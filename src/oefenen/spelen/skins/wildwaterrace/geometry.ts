// Wildwaterrace's scene geometry (art.tsx draws in these units, the screen places the rafts by them): the river's
// far and near edges (y), the waterfall's width (the curtain between the lip and the lake), and the tiles the banks
// and the flow lines repeat in (they scroll by whole tiles without a seam; 560 = 8 bank waves of 70).
export const BANK = { far: 70, near: 264 } as const;
export const CURTAIN = 46;
export const TILE = { bank: 560, flow: 200 } as const;
