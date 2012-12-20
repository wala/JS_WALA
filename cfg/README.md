Control Flow Graph Utilities
============================

This package contains some utilities for building control flow graphs for normalized JavaScript programs.

* `cfg.js`:

  Module for constructing intraprocedural CFGs; exports method `buildCFG` that should be invoked
  on the root node of the AST. Every statement node will be given attributes `succ` and `pred`
  containing, respectively, its control flow successor and predecessor sets.
            
* `dominators.js`:

  Module for building dominator and post-dominator trees; exports method `buildDominatorTrees`
  that should be invoked with the root node of the AST as its first argument. If the second
  argument is truthy, both the dominator and the post-dominator tree will be built, otherwise only
  the dominator tree. Every statement node is given an attribute `idom` containing its immediate
  dominator node (if any); the immediate post-dominator is stored in attribute `ipdom`.
            
  Every function additionally has a special entry node that serves to root the CFG, its successor
  is the first statement of the function; if there are statically unreachable statements within
  the function body (e.g., statements after a `throw` or `return`), they are also made to be
  successors of the entry node. This is necessary for standard CFG algorithms to work.
            
  The top-level program also has an an entry node. Additionally, function and program nodes
  serve as their own exit nodes: a function node is the immediate successor of any `return`
  statement in its body, as well as of any `throw` that appears outside a `try` statement, and
  similar for program nodes.