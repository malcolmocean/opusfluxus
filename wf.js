#! /usr/bin/env node

const fs = require('fs')
const userhome = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']
const config_path = userhome+"/.wfconfig.json"
function loadWfConfig() {
  let exists = fs.existsSync(config_path)
  let config = {aliases: {}}
  if (fs.existsSync(config_path)) {
    let configString = fs.readFileSync(config_path, 'utf8')
    try {
      return JSON.parse(configString)
    } catch(err) {
      console.log('Error parsing JSON string:', err)
      return {aliases: {}}
    }
  } else {
    let sessionid = tryConvertingWfrcFile()
    if (sessionid) {
      config.sessionid = sessionid
      try {
        // console.log("would unlink here")
         fs.unlinkSync(userhome+"/.wfrc")
      } catch (err) {}
    }
    fs.writeFileSync(config_path, JSON.stringify(config))
    return config
  }
}

function writeWfConfig(config) {
  // console.log("config", config)
  try {
    fs.writeFileSync(config_path, JSON.stringify(config))
  } catch (err) {
    console.log('Could not write wfconfig file.', err)
  }
}

function tryConvertingWfrcFile () {
  const rc_path = userhome+"/.wfrc"
  const rc = fs.existsSync(rc_path) && fs.readFileSync(rc_path, 'utf8')
  rc_regex = /sessionid: (\w+)/
  if (rc && rc_regex.test(rc)) {
    return rc.match(rc_regex)[1]
  }
}

function run (argv) {
  argv = argv || {_: []}

  const Workflowy = require('./')

  function handleErr(reason) {
    while (reason.reason) {reason = reason.reason}
    if (reason.status == 404) {
      console.log("It seems your sessionid has expired. Let's log you in again.")
      return auth()
    } else {
      console.log("Error " + reason.status + ": ", reason.message)
      process.exit(1)
    }
  }

  const config = loadWfConfig()
  const aliases = config.aliases

  var withnote = false
  var hiddencompleted = false 
  var withid = false
  var id = null

  function recursivePrint (node, prefix, spaces, maxDepth) {
    if (hiddencompleted && node.cp) {return}
    if (!prefix) {prefix = '\u21b3 '}
    if (!spaces) {spaces = ''}
    var println = ''
    println = spaces + prefix + node.nm
    if (withnote && node.no) {
      println += '\n'+spaces+'    '+ node.no
    }

    if (withid) {println += '\n[' + node.id + ']'}

    console.log(println)

    if (maxDepth < 1) {return}

    var children = node.ch
    for (var i in children) {
      recursivePrint(children[i], prefix, spaces+' ', maxDepth-1)
    }
  }

  function apply_alias(id) {
    if (id != undefined && !id.match("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")) {
      // id not uuid, used alias
      return aliases[id]
    }
    return id
  }

  function printHelp () {
    console.log("usage: wf <command> [<args>]\n")
    console.log("The commands currently available are:\n")
    console.log(" tree n                     "+"print your workflowy nodes up to depth n (default: 2)")
    console.log("   [--id=<id/alias>]           "+"print sub nodes under the <id> (default: whole tree)")
    console.log("   [--withnote]                "+"print the note of nodes (default: false)")
    console.log("   [--hiddencompleted]         "+"hide the completed lists (default: false)")
    console.log("   [--withid]                  "+"print id of nodes (default: false)")
    console.log("")
    console.log(" capture                    "+"add something to a particular node")
    console.log("    --parentid=<id/alias>       "+"36-digit uuid of parent (required) or defined alias")
    console.log("    --name=<str>                "+"what to actually put on the node (required)")
    console.log("   [--priority=<int>]               "+"0 as first child, 1 as second (default 0 (top))")
    console.log("                                "+"    (use a number like 10000 for bottom)")
    console.log("   [--note=<str>]               "+"a note for the node (default '')")
    console.log("")
    console.log(" alias                      "+"list all curretnly defined aliases")
    console.log("")
    console.log(" alias add                  "+"add new alias")
    console.log("    --id=<id>                   "+"36-digit uuid to alias (required)")
    console.log("    --name=<alias>              "+"name to give the alias (required)")
    console.log("")
    console.log(" alias remove               "+"remove existing alias")
    console.log("    --name=<str>                "+"name to give the alias (required)")
    console.log("")
  }

  var command = argv._[0]
  async function runCommand () {
    console.log("runCommand")
    if (command === 'alias') {
      verb = argv._[1]
      if (verb === 'add') {
        aliases[argv.name] = argv.id
        writeWfConfig(config)
        console.log("Added new alias '" + argv.name + "' for id '" + argv.id + "'")
      } else if (verb === 'remove') {
        delete aliases[argv.name]
        writeWfConfig(config)
        console.log("Removed alias for name '" + argv.name + "'")
      } else {
        console.log(aliases)
      }
      return Promise.resolve()
    }

    var wf = new Workflowy({sessionid: config.sessionid, includeSharedProjects: config.includeSharedProjects})
    await wf.refresh().catch(err => {
      console.log('REFRESH error', err)
    })
    if (command === 'capture') {
      console.log("• • • creating workflowy node • • •")
      var parentid = apply_alias(argv.parentid)
      parentid && console.log("parentid", parentid)
      var priority = argv.priority
      var name = argv.name
      var note = argv.note
      return wf.create(parentid, name, priority, note).then(function (result) {
        console.log("created!")
      }, handleErr).then(() => process.exit())
    } else if (command === 'tree') { console.log("• • • fetching workflowy tree • • •")
      depth = argv.depth || argv._[1] || 2
      id = apply_alias(argv.id)
      withnote = argv.withnote
      hiddencompleted = argv.hiddencompleted
      withid = argv.withid

      if (id) {
        return wf.nodes.then(function (nodes) {
          var node = nodes.find(function (node) {
            return node.id == id
          })
          if (node) {
            recursivePrint(node, null, '', depth)
          } else {
            console.log('node ' + id + ' not found')
          }
        }, handleErr).then(() => process.exit())
      } else {
        return wf.outline.then(function (outline) {
          var rootnode = {
            nm: 'root',
            ch: outline,
            id: ''
          }
          recursivePrint(rootnode, null, '', depth)
        }, handleErr).then(() => process.exit())
      }
    } else if (command === 'create_tree_demo') {
      console.log("🌲 🌲 🌲 create tree demo 🌲 🌲 🌲")
      return wf.createTree('None', {
        nm: "test " + Math.ceil(100*Math.random()),
        no: ""+new Date(),
        ch: [
          {nm: "this is a child"},
          {nm: "a what?",
            ch: [
              {nm: "a child"},
              {nm: "a what?",
                ch: [
                  {nm: "a child"},
                  {nm: "oh, a child"},
                ],
              },
            ],
          },
        ],
      }).then(tree => {
        console.log("🌲 🌲 🌲   tree created!   🌲 🌲 🌲")
        console.log(tree) // now with IDs
      }).catch(err => {
        console.log("🌲 tree creation err:", err)
      }).then(() => process.exit())
    } else { console.log("• • • fetching workflowy data • • •")
      return wf.meta.then(function (meta) {
        console.log("logged in as " + meta.settings.username)
        console.log(meta.projectTreeData.mainProjectTreeInfo.rootProjectChildren.length + " top-level nodes")
        if (command === 'meta') {
          console.log("meta", meta)
        } else if (command === 'aux') {
          console.log("meta.projectTreeData.auxiliaryProjectTreeInfos", meta.projectTreeData.auxiliaryProjectTreeInfos)
        } else {
          console.log("(to view commands, run with --help)")
        }
      }, handleErr).then(() => process.exit())
    }
  }

  // THIS IS NOT ACTUALLY WORKING, FOR VARIOUS REASONS
  // probably a bunch of index.js wants to be restructured, honestly
  // since it keeps failing in opaque ways
  // and I'd like to get rid of the circular dependency inside one of my modules

  async function auth (opts={}) {
    const prompt = require('prompt')
    // console.log("What is your workflowy login info? You'll need to get your sessionid from your browser's cookies, since Workflowy hasn't made a proper API yet.")
    console.log("What is your workflowy sessionid? You have to find it in your browser's cookies, since Workflowy hasn't made a proper API yet.")
    let schema = {properties: {sessionid: {required: true}}}
    prompt.start()
    const result = await prompt.get(schema)
    let wf = new Workflowy({sessionid: result.sessionid})
    await wf.login()
    if (!wf.sessionid) {
      throw new Error("Failed to get sessionid")
    }
    console.log("Login successful.")
    try {
      config.sessionid = wf.sessionid
      writeWfConfig(config)
      console.log("Successfully wrote sessionid to " + config_path)
    } catch (e) {
      return console.log("Failed to write sessionid to " + config_path)
    }
    if (command) {
      console.log("command", command)
      return runCommand()
    } else {
      console.log("returning config.sessionid", config.sessionid)
      return config.sessionid
    }
  }

  async function auth_old (opts={}) {
    const prompt = require('prompt')
    console.log("What is your workflowy login info? This will not be saved, merely used once to authenticate.")
    let schema = {properties: {email: {required: true}}}
    let wf = new Workflowy({})
    try {
      prompt.start()
      // return
      const result = await prompt.get(schema).catch(err => {
        console.log('prompt.get err', err)
      })
      return
      // if (err) {console.log('\nCANCELLED\n'); process.exit(1)}
      const email = result.email
      console.log("wf.getAuthType", wf.getAuthType)
      authType = await wf.getAuthType(email)
      console.log("authType", authType)
      if (authType == 'password') {
        schema = {properties: {
          password: {
            required: true,
            hidden: true
          }
        }}
      } else if (authType == 'code') {
        console.log(`An email has been sent to ${email} with a login code. Enter that code here:`)
        schema = {properties: {code: {required: true}}}
      }
      const result2 = prompt.get(schema)
      if (err) {console.log('\nCANCELLED\n'); process.exit(1)}
      wf = new Workflowy({username: email, password: result2.password, code: result2.code})
      await wf.login()
      if (!wf.sessionid) {
        throw new Error("Failed to get sessionid")
      }
      console.log("Login successful.")
      try {
        config.sessionid = wf.sessionid
        writeWfConfig(config)
        console.log("Successfully wrote sessionid to " + config_path)
      } catch (e) {
        return console.log("Failed to write sessionid to " + config_path)
      }
      if (command) {
        console.log("command", command)
        return runCommand()
      } else {
        console.log("returning config.sessionid", config.sessionid)
        return config.sessionid
      }
    } catch (err) {
      console.log("Failed to get sessionid. Check your username/password.")
    }
  }

  if (argv.help) {
    printHelp()
  } else if (config && config.sessionid) {
    return runCommand()
  } else {
    console.log("No "+config_path+" detected... starting authentication process...")
    return auth()
  }
}

if (require.main === module) { // called directly
  const argv = require('minimist')(process.argv.slice(2))
  run(argv)
} else {
  exports.run = run
  exports.loadWfConfig = loadWfConfig
  exports.writeWfConfig = writeWfConfig
}
