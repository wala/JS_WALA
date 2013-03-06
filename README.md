This repository contains WALA analyses and tools that are implemented in JavaScript.  (This is not to be confused with the [JavaScript front-end](http://wala.sourceforge.net/wiki/index.php/Getting_Started:JavaScript_frontend) for the core WALA analysis framework, which is implemented in Java and is available in the [WALA repository](https://github.com/wala/WALA).)

There are currently three packages:

* `normalizer`: a normalizer that converts JavaScript programs into a simpler form to ease other analyses
* `cfg`: a package for building intraprocedural control flow graphs for programs that are already normalized
* `common`: common modules used by the other packages

Package `normalizer-rhino` is a Java wrapper for `normalizer`.

See the packages' individual READMEs for more details.

We hope to add other analysis and instrumentation infrastructure in the future.

All code is available under the [Eclipse Public License](http://www.eclipse.org/legal/epl-v10.html).
 
