Control Flow Graph Utilities
============================

This package contains some utilities for building control flow graphs for normalized JavaScript programs.

* `cfg.js`: Module for constructing intraprocedural CFGs; exports method `buildCFG` that should be invoked
            on the root node of the AST. Every statement node will be given attributes `succ` and `pred`
            containing, respectively, its control flow successor and predecessor sets.
            
* `dominators.js`: Module for building dominator and post-dominator trees; exports method `buildDominatorTrees`
            that should be invoked with the root node of the AST as its first argument. If the second
            argument is truthy, both the dominator and the post-dominator tree will be built, otherwise only
            the dominator tree. Every statement node is given an attribute `idom` containing its immediate
            dominator node (if any); the immediate post-dominator is stored in attribute `ipdom`. 