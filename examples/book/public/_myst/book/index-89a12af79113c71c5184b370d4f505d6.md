---
title: Introduction
subtitle: A MyST-compiled page rendered by Astro
---

This site is written in MyST Markdown, compiled with the `mystmd` engine, and rendered by Astro.
Every number you see below (sections, figures, equations, tables) is assigned automatically.

(sec-motivation)=
## Motivation

The time evolution of a closed quantum system is governed by the Schrödinger equation
{cite:p}`schrodinger1926`, which we restate in @eq-schrodinger on the [theory page](./theory.md).
The measured signal is shown in @fig-signal, and the parameters are listed in @tbl-params.

:::{figure} images/signal.svg
:label: fig-signal
:width: 80%
A damped oscillating signal measured over time $t$.
:::

:::{table} Simulation parameters
:label: tbl-params

| Symbol | Meaning | Value |
|---|---|---|
| $\omega$ | angular frequency | $2\pi \times 5\,\mathrm{GHz}$ |
| $\gamma$ | damping rate | $0.1\,\mu\mathrm{s}^{-1}$ |
:::

## Outline

- {ref}`sec-motivation` motivates the work.
- [](#sec-theory) develops the theory, including @eq-energy.
- [](#sec-results) shows the results, e.g. {numref}`Figure %s <fig-orbit>`.

:::{note}
Cross-references work **across pages**: @fig-orbit lives on the results page.
:::
