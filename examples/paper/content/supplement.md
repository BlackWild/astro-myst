---
title: Supplementary material
numbering:
  enumerator: S%s
---

This supplement is written in MyST Markdown. Its numbers use an `S` prefix
(set with `numbering.enumerator` in the frontmatter), and it refers back to the
LaTeX article: the master equation [](#eq:lindblad), the model in [](#sec:model) and
[](#fig:rabi).

## Envelope of the oscillations

For weak damping, the excited-state population follows

```{math}
:label: eq-s-envelope
P_e(t) \approx \tfrac12\left(1 - e^{-3\gamma t/4}\cos\Omega t\right),
```

whose envelope is drawn in [](#fig:rabi).

:::{figure} figures/bloch.svg
:label: fig-s-bloch
:width: 60%
Trajectory on the Bloch sphere, spiralling towards the steady state.
:::

The DOI form of a citation works too: <doi:10.1007/BF01608499> resolves to the
entry in `references.bib`.
