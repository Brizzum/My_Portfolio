import MeridianConvergence from './meridian-convergence/MeridianConvergence.jsx';
import Distributions from './distributions/Distributions.jsx';

// Registry of gallery entries: add a new concept here to list and route it.
export const CONCEPTS = [
  {
    slug: 'meridian-convergence',
    title: 'Meridian Convergence & Wind Direction',
    summary: 'How map projections rotate Grid North away from True North, and what that does to wind directions.',
    Component: MeridianConvergence,
  },
  {
    slug: 'distributions',
    title: 'Probability Distributions: PDF & CDF',
    summary: 'Parametrise common distributions and read off mean, median, mode and percentiles.',
    Component: Distributions,
  },
];
