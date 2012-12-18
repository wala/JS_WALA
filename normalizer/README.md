JavaScript Normalizer
=====================

This is a library for normalizing JavaScript. It takes an arbitrary JavaScript program and translates it into a more regular subset of JavaScript as described in `doc/normalization.md`.

The main API entry point is function `normalizer` in module `lib/normalizer.js`; it takes the AST of the whole program as produced by [Esprima](http://www.esprima.org) and returns the AST of the normalized program.

If the original AST has position information, the nodes of the normalized AST will have the same positions as the nodes they originated from. See `doc/normalization.md` for a description of the format in which positions are stored.

Optionally, you can also pass an object with flags for customizing the normalization process. Currently, the following flags are supported:

  * `backwards_compatible`: normalize in a way compatible with a previous implementation; intentionally not documented (very much); will eventually go away
  * `reference_errors`: if set to true, read accesses to global variables will be normalized in such a way that they throw a ReferenceError for undefined and undeclared globals; since this leads to significant code bloat in programs using the DOM and the standard library, this flag is set to false by default, meaning that reads of undefined/undeclared globals return undefined and don't throw an exception
  * `unfold_ifs`: if set to true, if statements will be unfolded so that at most one branch is non-trivial
  * `unify_ret`: rewrite functions so that they only have one single `return` statement at the very end
