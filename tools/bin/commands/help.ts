import { testAll } from "./test-all";

const HELP = `
Usage: grok <command>

Datagrok's package management tool

Commands:
    add       Add an object template
    api       Create wrapper functions
    check     Check package content (function signatures, etc.)
    config    Create and manage config files
    create    Create a package
    init      Modify a package template
    link      Link \`datagrok-api\` and libraries for local development
    publish   Upload a package
    test      Run package tests
    testall      Run packages tests

To get help on a particular command, use:
    grok <command> --help

Read more about the package development workflow:
https://datagrok.ai/help/develop/develop
`;

const HELP_ADD = `
Usage: grok add <entity> <name>

Add an object template to your package:

grok add app <name>
grok add connection <name>
grok add detector <semantic-type-name>
grok add function [tag] <name>
grok add query <name>
grok add script [tag] <language> <name>
grok add view <name>
grok add viewer <name>
grok add tests

Please note that entity names may only include letters and numbers

Supported languages for scripts:
javascript, julia, node, octave, python, r

Available tags:
panel, init
`;

const HELP_INIT = `
Usage: grok init

Modify a package template by adding config files for linters, IDE, etc.

Options:
[--eslint] [--ide] [--test] [--ts] [--git]

--eslint    Add a configuration for eslint
--ide       Add an IDE-specific configuration for debugging (vscode)
--test      Add tests support (TypeScript packages only)
--ts        Convert a JavaScript package to TypeScript
--git       Configure GIT and install commit linting tools.
            Read more: https://datagrok.ai/help/develop/advanced/git-policy
`;

const HELP_API = `
Usage: grok api

Create wrapper functions for package scripts and queries
`;

const HELP_CONFIG = `
Usage: grok config

Create or update a configuration file

Options:
[--reset] [--server] [--alias] [-k | --key]

--reset     Restore the default config file template
--server    Use to add a server to the config (\`grok config add --alias alias --server url --key key\`)
--alias     Use in conjunction with the \`server\` option to set the server name
--key       Use in conjunction with the \`server\` option to set the developer key
--default   Use in conjunction with the \`server\` option to set the added server as default
`;

const HELP_CREATE = `
Usage: grok create [name]

Create a package:

grok create         Create a package in the current working directory
grok create <name>  Create a package in a folder with the specified name

Please note that the package name may only include letters, numbers, underscores, or hyphens

Options:
[--eslint] [--ide] [--js | --ts] [--test]

--eslint    Add a configuration for eslint
--ide       Add an IDE-specific configuration for debugging (vscode)
--js        Create a JavaScript package
--ts        Create a TypeScript package (default)
--test      Add tests support (TypeScript packages only)
`;

const HELP_PUBLISH = `
Usage: grok publish [host]

Upload a package

Options:
[--build|--rebuild] [--debug|--release] [-k | --key] [--suffix] [--all] [--refresh] [--link]

--all             Publish all available packages 
--refresh         Publish all available already loaded packages 
--link  	        Link the package to local utils

Running \`grok publish\` is the same as running \`grok publish defaultHost --build --debug\`
`;

const HELP_CHECK = `
Usage: grok check

Options:
[-r | --recursive]

--recursive       Check all packages in the current directory

Check package content (function signatures, import statements of external modules, etc.)
`;

const HELP_TEST = `
Usage: grok test

Options:
[--package] [--category] [--test] [--host] [--csv] [--gui] [--skip-build] [--skip-publish] [--link] [--catchUnhandled] [--report] [--record] [--verbose] [--platform] [--benchmark] [--stress-test] --[debug]

--package           Specify a package name to run tests for
--category          Specify a category name to run tests for
--test              Specify a test name to run 
--host              Host alias as in the config file
--csv               Save the test report in a CSV file
--gui               Launch graphical interface (non-headless mode)
--debug             Enables debug point on tests run (useless without gui mode(you also have to open Inspector)) 
--catchUnhandled    Catch unhandled exceptions during test execution (default=true)
--report            Report failed tests to audit, notifies package author (default=false)
--skip-build        Skip the package build step
--skip-publish      Skip the package publication step
--link  	          Link the package to local utils
--record            Records the test execution process in mp4 format
--verbose           Prints detailed information about passed and skipped tests in the console
--platform          Runs only platform tests (applicable for ApiTests package only)
--core              Runs package & auto tests & core tests (core tests run only from DevTools package)
--benchmark   	    Runs tests in benchmark mode
--stress-test       Runs shuffled stress-test only
 
Run package tests

See instructions:
https://datagrok.ai/help/develop/how-to/test-packages#local-testing
`;

const HELP_TESTALL = `
Usage: grok testall

Options:
[--packages] [--host] [--csv] [--gui] [--skip-build] [--skip-publish] [--link-package] [--catchUnhandled] [--report] [--record] [--verbose] [--benchmark] [--stress-test] [--order] [--tags] [--testRepeat] [--browsers-count] [--debug]

--packages          Specify a packages names to run tests for
--host              Host alias as in the config file
--csv               Save the test report in a CSV file
--gui               Launch graphical interface (non-headless mode)
--debug             Enables debug point on tests run (useless without gui mode(you also have to open Inspector)) 
--catchUnhandled    Catch unhandled exceptions during test execution (default=true)
--report            Report failed tests to audit, notifies packages author (default=false)
--skip-build        Skip the packages build step
--skip-publish      Skip the packages publication step
--link-package  	  Link the packages to local utils
--record            Records the test execution process in mp4 format
--verbose           Prints detailed information about passed and skipped tests in the console
--core              Runs packages & core tests (applicable  for DevTools packages only)
--benchmark   	    Runs tests in benchmark mode
--stress-test       Runs shuffled stress-test only
--order             Specify order for tests invocation
--tags              Filter tests by tag name for run
--testRepeat        Set amount of tests repeats
--browsers-count      Set amount of browsers for tests run

Run tests of all or specified packages 

See instructions:
https://datagrok.ai/help/develop/how-to/test-packages#local-testing
`;

const HELP_LINK = `
Usage: grok link

Link \`datagrok-api\` and libraries for local development
`;

// const HELP_MIGRATE = `
// Usage: grok migrate

// Switch to \`grok\` tools by copying your keys to the config
// file and converting your scripts in the \`package.json\` file
// `;

export const help = {
  add: HELP_ADD,
  api: HELP_API,
  check: HELP_CHECK,
  config: HELP_CONFIG,
  create: HELP_CREATE,
  init: HELP_INIT,
  link: HELP_LINK,
  publish: HELP_PUBLISH,
  test: HELP_TEST,
  testall: HELP_TESTALL,
  help: HELP,
};
