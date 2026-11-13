import type { StepLine, StepToken } from '../math/workedSteps';

// How one exercise type travels in the stappenhulp QR (tutor.html) and is worked out there. Light on
// purpose: the tutor bundle imports this, so a codec never imports REGISTRY, a generator or a viewer.
// Hoofdrekenen sums keep their own compact forms in tutorPayload.ts; every other type uses a codec.
export interface TutorCodec<D = unknown> {
    // The wire id: short, unique, never changed or reused once released (printed QRs carry it).
    id: string;
    // The typeIds whose exercises this codec carries; they share one data shape (and one steps visual).
    typeIds: readonly string[];
    // The Dutch noun in the "kan niet gelezen worden (…)" message when `in` refuses the data.
    what: string;
    // Exercise + its block's settings → compact JSON data, or null when this exercise cannot travel (or is not this
    // codec's: on a typeId with several codecs, or a hoofdrekenen typeId, null leaves it to the next one / the sum forms).
    // Fold any setting the steps depend on into the data: the tutor page never sees the block.
    out(ex: unknown, constraints: Record<string, unknown>): unknown;
    // Wire data → the exercise-like data steps, sum and the visual read; null = broken or hostile.
    in(wire: unknown): D | null;
    // The worked steps, the same lines REGISTRY[typeId].steps gives this exercise on the sheet.
    steps(data: D): StepLine[] | null;
    // The exercise as printed, for the tutor's list and the card's heading.
    sum(data: D): StepToken[];
}

// Typed authoring, untyped storage: the registry holds codecs of different data shapes.
export const defineCodec = <D>(codec: TutorCodec<D>): TutorCodec => codec as unknown as TutorCodec;
