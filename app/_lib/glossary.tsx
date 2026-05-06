import type { ReactNode } from "react";

type Entry = { term: string; definition: ReactNode };

export const glossary: Record<string, Entry> = {
  dataset: {
    term: "Dataset",
    definition:
      "A collection of training examples — here, (x, y) pairs the model tries to fit a line through.",
  },
  noise: {
    term: "Noise (σ)",
    definition:
      "Random scatter added to each y. Larger σ means more spread around the underlying line, so the fit is harder and the residuals grow.",
  },
  residuals: {
    term: "Residuals",
    definition:
      "The vertical gap between each observed point and the model's prediction. Squared and averaged, residuals are exactly what the loss penalizes.",
  },
  confidenceBand: {
    term: "Confidence band",
    definition:
      "A ±1σ band around the fitted line, where σ is the standard deviation of the residuals. Roughly two thirds of points should land inside it.",
  },
  optimizer: {
    term: "Optimizer",
    definition: (
      <>
        <p className="mb-2">
          The algorithm that adjusts the model&apos;s parameters to lower the loss. Different
          optimizers trade off speed, memory, and stability.
        </p>
        <ul className="space-y-1 text-zinc-600">
          <li>
            <b className="text-zinc-900">OLS</b> — exact closed-form solution, no iteration needed.
          </li>
          <li>
            <b className="text-zinc-900">GD</b> — iterative steps in the gradient direction.
          </li>
          <li>
            <b className="text-zinc-900">SGD</b> — like GD, but one random example per step.
          </li>
          <li>
            <b className="text-zinc-900">Adam</b> — adaptive per-parameter learning rates.
          </li>
        </ul>
      </>
    ),
  },
  learningRate: {
    term: "Learning rate",
    definition:
      "How big a step the optimizer takes in the gradient direction each iteration. Too small and training crawls; too large and it overshoots or diverges.",
  },
  epochs: {
    term: "Epochs",
    definition:
      "One epoch is one full pass over the dataset. More epochs give the optimizer more chances to refine its parameters — at the cost of compute.",
  },
  mse: {
    term: "Mean squared error",
    definition:
      "The average of (y − ŷ)² across the dataset. Lower is better. Sensitive to outliers because the errors are squared.",
  },
  r2: {
    term: "R² · coefficient of determination",
    definition:
      "The fraction of variance in y that the model explains. 1.0 is a perfect fit; 0 means the model is no better than predicting the mean; negative means it's worse.",
  },
};
