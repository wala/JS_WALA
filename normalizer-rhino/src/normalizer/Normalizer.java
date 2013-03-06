/*******************************************************************************
 * Copyright (c) 2013 Max Schaefer.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Max Schaefer - initial API and implementation
 *******************************************************************************/

/* Driver class for normalizing a JavaScript file via Rhino. */

package normalizer;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

import org.mozilla.javascript.tools.shell.Main;

public class Normalizer {
	private final static String basedir = Normalizer.class.getResource("/").toString();

	/**
	 * Normalizes the given file.
	 * 
	 * @param file name of the file to normalize
	 * @return normalized code
	 */
	public static String normalize(String file) {
		ByteArrayOutputStream baos = new ByteArrayOutputStream();
		PrintStream ps = new PrintStream(baos);
		try {
			Main.setOut(ps);
			Main.exec(new String[] { basedir + "normalize.js", basedir, file });
			ps.flush();
			return baos.toString();
		} finally {
			ps.close();
		}
	}

	// simple command line interface
	public static void main(String[] args) {
		if(args.length != 1)
			System.err.println("Usage: java Normalizer FILE.js");
		else
			System.out.println(normalize(args[0]));
	}
}
