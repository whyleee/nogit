#!/usr/bin/env node

var program = require('commander');
var clone = require('../commands/clone');

program
  .version(require('git-node').version);

program
  .command('clone <url> [dir]')
  .description('Clone a repository into a new directory')
  .option('--ref <branch/tag/ref>', 'checkout to specefic branch, tag, or ref', 'HEAD')
  .option('--depth <num>', 'do a shallow clone with num commits deep')
  .option('--mirror', 'not supported yet (will act as a "git fetch")')
  .option('-v, --verbose', 'show detailed output')
  .action(function(url, dir, options) {
    console.log('git clone %s to %s', url, dir);
    console.log('mirror? ' + (options.mirror ? 'true' : 'false'));
    clone(url, dir, options);
  });

  // .command("ls-remote <url>", "List remote refs")
  // .command("fetch <url>", "Download objects and refs from another repository")
  // .command("log", "Show local history")
  // .command("export <target>", "Export tree at HEAD as real files to target")

program.parse(process.argv);

if (process.argv.length < 3) {
  program.outputHelp();
  process.exit(1);
}