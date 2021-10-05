#! /usr/bin/env node

const prompts = require('prompts');
const Conf = require('conf');

const WorkflowyClient = require('./index.js');

const { program } = require('commander');

let config;

const initialize = async () => {
  config = new Conf();

  if (!config.has('sessionid')) {
    console.log(`No config detected... starting authentication process...`);
    await auth();
  }

  const sessionid = config.get('sessionid');
  const includeSharedProjects = config.get('includeSharedProjects');
  let wf = new WorkflowyClient({ sessionid, includeSharedProjects });

  await wf.refresh();

  return wf;
};

program
  .option(
    '-id, --id <id>',
    '36-digit uuid of parent (required) or defined alias'
  )
  .option(
    '-p, --priority <priority>',
    'priority of the new node, 0 as first child',
    0
  )
  .option('-i, --print-id', 'also print the node id', false)
  .option('-n, --print-note', 'also print the note', false)
  .option('-c, --hide-completed', 'hide completed lists', true);

program
  .command('alias [verb] [name]')
  .description('work with aliases')
  .action(async (verb, name) => {
    await initialize();
    const aliases = config.get('aliases');
    let { id } = program.opts();

    if (verb === 'add' && id) {
      config.set({ aliases: { [name]: id } });
      console.log(`Added new alias '${name}' for id '${id}'`);
    } else if (verb === 'remove' && name) {
      delete aliases[name];
      config.set('aliases', aliases);
      console.log(`Removed alias for name '${name}'`);
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

    console.log('⦿ creating workflowy node');
    let { id: parentId } = program.opts();
    parentId = applyAlias(parentId);

    if (parentId) {
      console.log('parentId', parentId);
    }

    const { priority } = program.opts();
    try {
      const result = await wf.create(parentId, text, priority, note);
    } catch (err) {
      console.error(err);
    }
    console.log('created!');
  });

program
  .command('tree <depth>')
  .description('print your workflowy nodes up to depth n')
  .action(async (depth) => {
    console.log('⦿ fetching workflowy tree');

    const wf = await initialize();

    const {
      printNote,
      hideCompleted,
      printId,
      id: originalId,
    } = program.opts();

    const id = applyAlias(originalId);
    const options = { printNote, hideCompleted, printId };

    if (id) {
      let node = wf.nodes.find((node) => node.id == id);
      if (node) {
        recursivePrint(node, undefined, '', depth, options);
      } else {
        console.log(`node ${id} not found`);
      }
    } else {
      let rootnode = {
        nm: 'root',
        ch: wf.outline,
        id: '',
      };
      recursivePrint(rootnode, undefined, '', depth, options);
    }
  });

program
  .command('meta')
  .description('meta')
  .action(async () => {
    const wf = await initialize();
    console.log('⦿ fetching workflowy data');
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

function recursivePrint(
  node,
  prefix = '\u21b3 ',
  spaces = '',
  maxDepth,
  options
) {
  const { printId, printNote, hideCompleted } = options;
  if (hideCompleted && node.cp) {
    return;
  }

  let println = [spaces, prefix, node.nm].join('');

  if (printNote && node.no) {
    println += `\n${spaces}    ${node.no}`;
  }

  if (printId) {
    println += ` [${node.id}]`;
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

function applyAlias(id) {
  const aliases = config.get('aliases');
  const regex =
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  return id != undefined && !id.match(regex) ? aliases[id] : id;
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

program.parseAsync(process.argv);
