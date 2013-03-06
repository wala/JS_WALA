Java Wrapper for JS_WALA Normalizer
===================================

This is a Java wrapper for the JS_WALA normalizer. It uses Rhino to run the normalizer on a provided JavaScript file, returning the source code of the normalized script as a string.


Setup
-----

Use the default target of the provided Ant build file to pull in Rhino and the JavaScript source code of the normalizer.

If you are using Eclipse, refresh the project to make sure that all JavaScript sources are copied to the output folder. Otherwise, you have to do so manually.

The main API method for the normalizer is `Normalizer.normalize`.


License
-------

Like the rest of JS_WALA, this wrapper is distributed under the Eclipse Public License; see `LICENSE.txt` in the parent directory.
