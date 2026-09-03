import { modelWeights, type AttributionModel } from "@growthos/logic";

/**
 * The five models, with the rule each one applies stated in full.
 *
 * The rules used to be one run-on sentence printed *under* the comparison table
 * ("Last/first-click credit a single touch; linear splits evenly; …"), which put
 * five definitions after the moment a reader needed them and got one of them
 * wrong: position-based is only 40/40 when there is a middle to give the other
 * 20% to, and falls back to an even split on a two-touch path. Six of the ten
 * seeded paths are two touches long, so that footnote mis-described the majority
 * of the data. `shapeOf` and the path ledger both read `modelWeights` directly,
 * so what is drawn cannot drift from what is computed.
 */
export const MODELS: { key: AttributionModel; label: string; rule: string }[] = [
  {
    key: "last_click",
    label: "Last click",
    rule: "All credit to the final touch before the sale. Everything earlier counts for nothing.",
  },
  {
    key: "first_click",
    label: "First click",
    rule: "All credit to the touch that started the path. Everything after it counts for nothing.",
  },
  {
    key: "linear",
    label: "Linear",
    rule: "Every touch in the path takes an equal share, however long the path is.",
  },
  {
    key: "time_decay",
    label: "Time decay",
    rule: "Later touches are worth more — each step back from the sale keeps 70% of the one after it.",
  },
  {
    key: "position_based",
    label: "Position-based",
    rule: "40% to the first touch and 40% to the last, with 20% shared by everything between. A path with no middle splits evenly.",
  },
];

export const MODEL_LABELS: Record<AttributionModel, string> = MODELS.reduce(
  (acc, m) => ({ ...acc, [m.key]: m.label }),
  {} as Record<AttributionModel, string>,
);

/**
 * A model's split over a four-touch path, normalised to its own heaviest touch.
 *
 * Drives the glyph on each picker button: four bars whose heights *are* the
 * weights, so the control shows the shape of the rule it selects. Four because it
 * is the longest path in the data and the shortest length at which all five
 * models look different from one another — at two touches, linear and
 * position-based are the same rule.
 */
export function shapeOf(model: AttributionModel, touches = 4): number[] {
  const weights = modelWeights(model, touches);
  const peak = Math.max(...weights, Number.EPSILON);
  return weights.map((w) => w / peak);
}

/**
 * A model's name as it reads inside a sentence.
 *
 * "$0 under Last click" capitalises mid-sentence and reads like a proper noun the
 * reader is supposed to already know. These are labels on a control, not names,
 * so prose lowercases them — and all five survive it ("position-based", "time
 * decay") without losing their hyphen or their meaning.
 */
export const prose = (label: string) => label.toLowerCase();

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Weights read as whole percents; a touch credited nothing reads as a dash, not "0%". */
export const weightPct = (w: number) => (w === 0 ? "—" : `${Math.round(w * 100)}%`);
