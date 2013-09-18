Description of the Normalization
================================


JavaScript Normal Form
----------------------

A program in JavaScript Normal Form (JSNF) obeys the following grammar:

    Program ::= (function(__global) { Decl? Stmt* })(typeof global === 'undefined' ? this : global);
    
    Decl    ::= var x1, x2, ..., xn;
    
    Stmt    ::= x = (function f(y1, ..., yn) { Decl? Stmt+ });
             |  x = LITERAL;
             |  x = null;
             |  x = this;
             |  x = [ y1, ..., yn ];
             |  x = { Prop* };
             |  x = y;
             |  x = y[z];
             |  x[y] = z;
             |  x = delete y;
             |  x = delete y[z];
             |  x = UNOP y;
             |  x = y BINOP z;
             |  x = f(y1, ..., yn);
             |  x = z[f](y1, ..., yn);
             |  x = new f(y1, ..., yn);
             |  return x;
             |  return;
             |  break l;
             |  throw x;
             |  ;
             |  debugger;
             |  l: Stmt
             |  if(x) { Stmt+ } else { Stmt+ }
             |  while(x) { Stmt+ }
             |  for(x in y) { Stmt+ }
             |  try { Stmt+ } catch(x) { Stmt+ }
             |  try { Stmt+ } finally { Stmt+ }
             
    Prop    ::= STRING : y
             |  get p() { Stmt+ }
             |  set p(x) { Stmt+ }
             
Here, `x`, `y`, `z`, `f`, `p`, `l` and variants are names. The terminal `LITERAL` stands for a string, number, boolean or regular expression literal.
`STRING` is a string literal, `UNOP` is a unary operator, and `BINOP` is a binary operator.

Names always refer to local variables, whereas references to global variables are rewritten into appropriate property reads or writes on `__global`.
If the normalizer is passed the `reference_errors` option, reads of global variables will further be rewritten to throw a `ReferenceError` exception if the variable in question has not been declared or defined.
The sole exception to this are direct calls to `eval`, where the callee expression `eval` may be a reference to a global variable.
This is necessary to preserve semantics.

The translation to normal form introduces (lots of) temporary variables named `tmp0`, `tmp1` and so on. The normalizer does not check for name clashes with existing variables, although it undoubtedly should.

Note that `for` and `do` loops are desugared into `while` loops, `continue` statements are converted into `break` statements. This sometimes results in (moderate amounts of) code duplication. All `break` statements in the normalized program have an explicit target label.

If the normalizer is passed the `unfold_ifs` option, `if` statements are further simplified so that at most one of their branches is non-trivial, i.e., contains a non-empty statement.

If the normalizer is passed the `unify_ret` option, every function only contains one single `return` statement at the very end of the function; all other `return` statements are converted into assignments to a result variable and a following `break` statement. The name of the return variable is stored in attribute `ret_var` of the function AST node. The normalized program will not contain empty return statements of the form `return;`.



Position information
--------------------

If the original AST has position information, then so does the normalized AST, with every normalized AST node having the same position as the node it originated from.

However, we do not use the Esprima position annotations, which somewhat awkwardly distribute position information across several different properties.
Instead, the position information for node `nd` is stored in `nd.attr.pos`, and uses the ADT defined in module `common/lib/position.js`.

Source positions include the URL of their containing script, but Esprima ASTs do not usually store a program's URL.
When the normalizer is passed an AST, it first checks whether the root node has the (non-standard) property `url`, and if so takes this to be the program's URL.
Otherwise, it checks whether the `options` object (see above) has a `url` property.
If neither is the case, the URL defaults to `<unknown>`.
