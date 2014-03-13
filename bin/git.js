#!/usr/bin/env node

var program = require('commander');
var clone = require('../commands/clone');
var archive = require('../commands/archive');
var lsRemote = require('../commands/ls-remote');
var fs = require('fs');
var ini = require('ini');

program
  .version(require('git-node').version)
  .option('-v, --verbose', 'show detailed output');

program
  .command('clone <url> [dir]')
  .description('Clone a repository into a new directory')
  .option('-b, --branch <branch/tag/ref>', 'checkout to specefic branch, tag or ref', /* default */ 'HEAD')
  .option('--depth <num>', 'do a shallow clone with num commits deep')
  .option('--mirror', 'not supported yet (will act as a "git fetch")')
  .option('--progress', 'show progress status')
  .option('-v, --verbose', 'show detailed output')
  .action(function(url, dir, options) {
    clone(url, dir, options);
  });

program
  .command('fetch [repo]')
  .description('Download objects and refs from another repository')
  .option('-a, --append', 'pppend ref and object names of fetched refs to the .git/FETCH_HEAD')
  .action(function(repo, options) {
    // todo
  });

program
  .command('config')
  .description('Get repository options')
  .option('--get <key>', 'get the value for a given key')
  .action(function(options) {
    if (options.get) {
      var config = ini.parse(fs.readFileSync('config', 'utf8'));
      console.log(config['remote "origin"'].url);
    }
  });

program
  .command('rev-list <commit>')
  .description('Lists commit objects in reverse chronological order')
  .option('-n, --max-count <n>', 'limit the number of commits to output', parseInt)
  .action(function(commit, options) {
    if (commit == 'master' && options.maxCount == 1) {
      var hash = fs.readFileSync('refs/heads/master', 'utf8').trim();
      console.log(hash);
    }
    else {
      // todo
    }
  });

program
  .command('archive <commit>')
  .description('Create an archive of files from a named tree')
  .option('--format <tar|zip>', 'format of the resulting archive: tar or zip')
  .option('--prefix <path>', 'prepend <prefix>/ to each filename in the archive')
  .option('-v, --verbose', 'show detailed output')
  .action(function(commit, options) {
    archive(commit, options);
  });

program
  .command('ls-remote <repo>')
  .description('List references in a remote repository')
  .option('-t, --tags', 'limit to tags')
  .option('-h, --heads', 'limit to heads')
  .action(function(repo, options) {
    lsRemote(repo, options);
  });


  // .command("fetch <url>", "Download objects and refs from another repository")
  // .command("log", "Show local history")
  // .command("export <target>", "Export tree at HEAD as real files to target")

fixNumArgs();
program.parse(process.argv);

if (process.argv.length < 3) {
  program.outputHelp();
  process.exit(1);
}

function fixNumArgs() {
  for (var i = 0; i < process.argv.length; ++i) {
    if (/-[a-zA-Z](\d+)/g.test(process.argv[i])) {
      process.argv.splice(i + 1, 0, process.argv[i].slice(2));
      process.argv[i] = process.argv[i].slice(0, 2);
    }
  }
}