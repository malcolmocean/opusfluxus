#! /usr/bin/env node

const fs = require('fs');
const prompts = require('prompts');
const Conf = require('conf');

const WorkflowyClient = require('./index.js');

const { program } = require('commander');

const initialize = async () => {
  const config = new Conf();
  const aliases = config.get('aliases');

  let id = null;

  if (!config.has('sessionid')) {
    console.log(`No config detected... starting authentication process...`);
    auth();
  }

  const sessionid = config.get('sessionid');
  const includeSharedProjects = config.get('includeSharedProjects');
  let wf = new WorkflowyClient({ sessionid, includeSharedProjects });

  await wf.refresh();

  return wf;
};

program
  .command('alias <verb>')
  .description('work with aliases')
  .action((verb) => {
    if (verb === 'add') {
      config.set({ aliases: { [argv.name]: argv.id } });
      console.log(`Added new alias '${argv.name}' for id '${argv.id}'`);
    } else if (verb === 'remove') {
      const aliases = config.get('aliases');
      delete aliases[argv.name];
      config.set('aliases', aliases);
      console.log(`Removed alias for name '${argv.name}'`);
    } else {
      console.log(aliases);
    }
    return Promise.resolve();
  });

program
  .command('capture <text> [note]')
  .description('add something to a particular node')
  .action(async (text, note) => {
    const wf = await initialize();

    console.log('• • • creating workflowy node • • •');
    let { id: parentId } = program.opts();
    parentId = applyAlias(parentId);

    if (parentId) {
      console.log('parentId', parentId);
    }

    const { priority, hiddencompleted, withid } = program.opts();
    try {
      // todo use object not arguments
      const result = await wf.create(parentId, text, priority, note);
    } catch (err) {
      console.error(err);
    }
    console.log('created!');
  });

program
  .command('tree <depth>')
  .description('tree depth')
  .action(async (depth) => {
    console.log('• • • fetching workflowy tree • • •');

    const wf = await initialize();

    const {
      withnote,
      hiddencompleted,
      withid,
      id: originalId,
    } = program.opts();

    const id = applyAlias(originalId);
    const options = { withnote, hiddencompleted, withid };

    if (id) {
      let node = wf.nodes.find((node) => node.id == id);
      if (node) {
        recursivePrint(node, null, '', depth, options);
      } else {
        console.log(`node ${id} not found`);
      }
    } else {
      let rootnode = {
        nm: 'root',
        ch: wf.outline,
        id: '',
      };
      recursivePrint(rootnode, null, '', depth, options);
    }
  });

program
  .command('meta')
  .description('meta')
  .action(async () => {
    const wf = await initialize();
    console.log('• • • fetching workflowy data • • •');
    try {
      const {
        projectTreeData: {
          auxiliaryProjectTreeInfos,
          mainProjectTreeInfo: { rootProjectChildren },
        },
        settings: { username },
      } = await wf.meta();

      console.log(`logged in as ${username}`);
      console.log(`${rootProjectChildren.length} top-level nodes`);
    } catch (err) {
      console.error(err);
    }
  });

program
  .option('-i, --withid', 'also print the node id', false)
  .option('-n, --withnote', 'also print the note', false)
  .option('-h, --hiddencompleted', 'hide completed lists', true);

function recursivePrint(
  node,
  prefix = '\u21b3 ',
  spaces = '',
  maxDepth,
  options
) {
  const { withid, withnote, hiddencompleted } = options;
  if (hiddencompleted && node.cp) {
    return;
  }

  let println = spaces + prefix + node.nm;
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
    recursivePrint(children[i], prefix, spaces + ' ', maxDepth - 1, options);
  }
}

function applyAlias(id, aliases) {
  const regex =
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  return id != undefined && !id.match(regex) ? aliases.get(id) : id;
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
    await wf.refresh();
  } catch (err) {
    console.error('err', err);
  }

  console.log('Login successful.');

  try {
    config.set('sessionid', wf.sessionid);
    console.log(`Your session id is: ${wf.sessionid}`);
    console.log(`Successfully wrote sessionid to ${config.path}`);
  } catch (e) {
    return console.log(`Failed to write sessionid to config`);
  }
};

program.version('0.0.1');
program.option('-id', 'specify an id');
program.parseAsync(process.argv);
