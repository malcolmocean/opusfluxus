#! /usr/bin/env node

const fs = require('fs');
const prompts = require('prompts');

const userhome =
  process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'];

const config_path = `${userhome}/.wfconfig.json`;

function loadWfConfig() {
  let config = { aliases: {} };
  if (fs.existsSync(config_path)) {
    let configString = fs.readFileSync(config_path, 'utf8');
    try {
      return JSON.parse(configString);
    } catch (err) {
      console.log('Error parsing JSON string:', err);
      return { aliases: {} };
    }
  } else {
    let sessionid = tryConvertingWfrcFile();
    if (sessionid) {
      config.sessionid = sessionid;
      try {
        fs.unlinkSync(`${userhome}/.wfrc`);
      } catch (err) {}
    }
    fs.writeFileSync(config_path, JSON.stringify(config));
    return config;
  }
}

function writeWfConfig(config) {
  // console.log("config", config)
  try {
    fs.writeFileSync(config_path, JSON.stringify(config));
  } catch (err) {
    console.log('Could not write wfconfig file.', err);
  }
}

function tryConvertingWfrcFile() {
  const rc_path = `${userhome}/.wfrc`;
  const rc = fs.existsSync(rc_path) && fs.readFileSync(rc_path, 'utf8');
  rc_regex = /sessionid: (\w+)/;
  if (rc && rc_regex.test(rc)) {
    return rc.match(rc_regex)[1];
  }
}

function run(argv) {
  argv = argv || { _: [] };

  const WorkflowyClient = require('./index.js');

  function handleErr(reason) {
    while (reason.reason) {
      reason = reason.reason;
    }
    if (reason.status == 404) {
      console.log(
        "It seems your sessionid has expired. Let's log you in again."
      );
      return auth();
    } else {
      console.log(`Error ${reason.status}: `, reason.message);
      process.exit(1);
    }
  }

  const config = loadWfConfig();
  const aliases = config.aliases;

  let withnote = false;
  let hiddencompleted = false;
  let withid = false;
  let id = null;

  function recursivePrint(node, prefix, spaces, maxDepth) {
    if (hiddencompleted && node.cp) {
      return;
    }
    if (!prefix) {
      prefix = '\u21b3 ';
    }
    if (!spaces) {
      spaces = '';
    }
    let println = '';
    println = spaces + prefix + node.nm;
    if (withnote && node.no) {
      println += '\n' + spaces + '    ' + node.no;
    }

    if (withid) {
      println += '\n[' + node.id + ']';
    }

    console.log(println);

    if (maxDepth < 1) {
      return;
    }

    let children = node.ch;
    for (let i in children) {
      recursivePrint(children[i], prefix, spaces + ' ', maxDepth - 1);
    }
  }

  function apply_alias(id) {
    const regex =
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    return id != undefined && !id.match(regex) ? aliases[id] : id;
  }

  function printHelp() {
    console.log('usage: wf <command> [<args>]\n');
    console.log('The commands currently available are:\n');
    console.log(
      ` tree n                     print your workflowy nodes up to depth n (default: 2)`
    );
    console.log(
      `   [--id=<id/alias>]           print sub nodes under the <id> (default: whole tree)`
    );
    console.log(
      `   [--withnote]                print the note of nodes (default: false)`
    );
    console.log(
      `   [--hiddencompleted]         hide the completed lists (default: false)`
    );
    console.log(
      `   [--withid]                  print id of nodes (default: false)`
    );
    console.log('');
    console.log(
      ` capture                    add something to a particular node`
    );
    console.log(
      `    --parentid=<id/alias>       36-digit uuid of parent (required) or defined alias`
    );
    console.log(
      `    --name=<str>                what to actually put on the node (required)`
    );
    console.log(
      `   [--priority=<int>]               0 as first child, 1 as second (default 0 (top))`
    );
    console.log(
      `                                    (use a number like 10000 for bottom)`
    );
    console.log(
      `   [--note=<str>]               a note for the node (default '')`
    );
    console.log('');
    console.log(
      ` alias                      list all currently defined aliases`
    );
    console.log('');
    console.log(` alias add                  add new alias`);
    console.log(
      `    --id=<id>                   36-digit uuid to alias (required)`
    );
    console.log(
      `    --name=<alias>              name to give the alias (required)`
    );
    console.log('');
    console.log(` alias remove               remove existing alias`);
    console.log(
      `    --name=<str>                name to give the alias (required)`
    );
    console.log('');
  }

  let command = argv._[0];
  async function runCommand() {
    if (command === 'alias') {
      verb = argv._[1];
      if (verb === 'add') {
        aliases[argv.name] = argv.id;
        writeWfConfig(config);
        console.log(`Added new alias '${argv.name}' for id '${argv.id}'`);
      } else if (verb === 'remove') {
        delete aliases[argv.name];
        writeWfConfig(config);
        console.log(`Removed alias for name '${argv.name}'`);
      } else {
        console.log(aliases);
      }
      return Promise.resolve();
    }

    const { sessionid, includeSharedProjects } = config;
    let wf = new WorkflowyClient({ sessionid, includeSharedProjects });

    await wf.refresh();

    if (command === 'capture') {
      console.log('• • • creating workflowy node • • •');

      let parentid = apply_alias(argv.parentid);
      if (parentid) {
        console.log('parentid', parentid);
      }

      const { priority, name, note } = argv;
      try {
        const result = await wf.create(parentid, name, priority, note);
      } catch (err) {
        console.error(err);
      }
      console.log('created!');
      process.exit();
    } else if (command === 'tree') {
      console.log('• • • fetching workflowy tree • • •');
      depth = argv.depth || argv._[1] || 2;
      id = apply_alias(argv.id);
      const { withnote, hiddencompleted, withid } = argv;

      if (id) {
        let node = wf.nodes.find((node) => node.id == id);
        if (node) {
          recursivePrint(node, null, '', depth);
        } else {
          console.log(`node ${id} not found`);
        }
      } else {
        let rootnode = {
          nm: 'root',
          ch: wf.outline,
          id: '',
        };
        recursivePrint(rootnode, null, '', depth);
      }

      process.exit();
    } else if (command === 'create_tree_demo') {
      console.log('🌲 🌲 🌲 create tree demo 🌲 🌲 🌲');
      return wf
        .createTree('None', {
          nm: `test ${Math.ceil(100 * Math.random())}`,
          no: `${new Date()}`,
          ch: [
            { nm: 'this is a child' },
            {
              nm: 'a what?',
              ch: [
                { nm: 'a child' },
                {
                  nm: 'a what?',
                  ch: [{ nm: 'a child' }, { nm: 'oh, a child' }],
                },
              ],
            },
          ],
        })
        .then((tree) => {
          console.log('🌲 🌲 🌲   tree created!   🌲 🌲 🌲');
          console.log(tree); // now with IDs
        })
        .catch((err) => {
          console.log('🌲 tree creation err:', err);
        })
        .then(() => process.exit());
    } else {
      console.log('• • • fetching workflowy data • • •');
      return wf
        .meta()
        .then(function (meta) {
          console.log(`logged in as ${meta.settings.username}`);
          console.log(
            `${meta.projectTreeData.mainProjectTreeInfo.rootProjectChildren.length} top-level nodes`
          );
          if (command === 'meta') {
            console.log('meta', meta);
          } else if (command === 'aux') {
            console.log(
              'meta.projectTreeData.auxiliaryProjectTreeInfos',
              meta.projectTreeData.auxiliaryProjectTreeInfos
            );
          } else {
            console.log('(to view commands, run with --help)');
          }
        }, handleErr)
        .then(() => process.exit());
    }
  }

  const auth = async () => {
    console.log(
      'What is your workflowy login info? This will not be saved, merely used once to authenticate.'
    );

    let wf = new WorkflowyClient({});

    const { email } = await prompts({
      type: 'text',
      name: 'email',
      message: 'Email:',
    });

    const authType = await wf.getAuthType(email);

    const schemas = {
      password: { type: 'password', name: 'password', message: 'Password' },
      code: {
        type: 'text',
        name: 'code',
        message: `An email has been sent to ${email} with a login code. Enter that code here:`,
      },
    };

    const value = await prompts(schemas[authType]);

    wf = new WorkflowyClient({
      username: email,
      ...value,
    });

    try {
      await wf.login();
    } catch (err) {
      console.error('err', err);
    }

    console.log('Login successful.');

    try {
      config.sessionid = wf.sessionid;
      writeWfConfig(config);
      console.log(`Successfully wrote sessionid to ${config_path}`);
    } catch (e) {
      return console.log(`Failed to write sessionid to ${config_path}`);
    }

    if (command) {
      console.log('command', command);
      return runCommand();
    } else {
      console.log('returning config.sessionid', config.sessionid);
      return config.sessionid;
    }
  };

  if (argv.help) {
    printHelp();
  } else if (config && config.sessionid) {
    return runCommand();
  } else {
    console.log(
      `No ${config_path} detected... starting authentication process...`
    );
    return auth();
  }
}

if (require.main === module) {
  // called directly
  const argv = require('minimist')(process.argv.slice(2));
  run(argv);
} else {
  exports.run = run;
  exports.loadWfConfig = loadWfConfig;
  exports.writeWfConfig = writeWfConfig;
}
