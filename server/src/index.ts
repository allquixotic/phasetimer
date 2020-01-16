var path = require('path');
// Get the relative path from the working directory to the directory of the main app file
var rel = path.relative(process.cwd(), __dirname);
// Build the glob pattern for all JS files one that excludes node_modules, and use those
var alljs = path.join(rel, '**', '*.js');
var noNodeMods = '!' + path.join(rel, '**', 'node_modules', '**');
var njstrace = require('njstrace').inject({files: [alljs, noNodeMods], wrapFunctions: false, inspectArgs: false});
import { main } from "./server";

main();