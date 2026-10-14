---
title: Theory
---

(sec-theory)=
## The Schrödinger equation

The state $|\psi(t)\rangle$ evolves according to

```{math}
:label: eq-schrodinger
i\hbar \frac{\dd}{\dd t} |\psi(t)\rangle = \hat{H} |\psi(t)\rangle
```

For a time-independent Hamiltonian, energy eigenstates satisfy

$$
\hat{H} |n\rangle = E_n |n\rangle
$$ (eq-energy)

Combining @eq-schrodinger and @eq-energy gives the familiar phase evolution:

$$
|\psi(t)\rangle = \sum_n c_n e^{-i E_n t/\hbar} |n\rangle
$$ (eq-evolution)

### Harmonic oscillator

For the harmonic oscillator, $E_n = \hbar\omega\,(n + \tfrac{1}{2})$, see {eq}`eq-energy`
and the standard textbook treatment {cite}`nielsen2010`.[^note]

[^note]: Footnotes are numbered automatically, too.

```{prf:theorem} Unitarity
:label: thm-unitary
If $\hat{H}$ is Hermitian, the propagator $U(t) = e^{-i\hat{H}t/\hbar}$ is unitary.
```

@thm-unitary guarantees that norm is conserved in @eq-evolution.
