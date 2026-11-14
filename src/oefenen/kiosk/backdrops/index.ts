import { createElement, type ComponentType, type ReactNode } from 'react';
import Bijen from './Bijen';
import Monsters from './Monsters';
import Lava from './Lava';
import Jungle from './Jungle';
import Sneeuw from './Sneeuw';
import Woestijn from './Woestijn';
import './backdrops.css';

// One scene per leerjaar behind the pupil pages (owner, 2026-11-15); no leerjaar = the plain sky and hill.
export const BACKDROPS: Record<number, ComponentType> = { 1: Bijen, 2: Monsters, 3: Lava, 4: Jungle, 5: Sneeuw, 6: Woestijn };

/** The leerjaar's scene, or null (no leerjaar, or one without a scene): the caller keeps its plain sky. */
export function sceneOf(grade?: number | null): ReactNode {
    const Scene = grade ? BACKDROPS[grade] : undefined;
    return Scene ? createElement(Scene) : null;
}
