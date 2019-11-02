#! /usr/bin/env node
var Workflowy = require('./')
var exec = require('child_process').exec
var prompt = require('prompt')
var fs = require('fs')
var Q = require('q')

var argv = require('minimist')(process.argv.slice(2))

var userhome = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']
var rc_path = userhome+"/.wfconfig.json"

var exists = fs.existsSync(rc_path)
var rc = exists && fs.readFileSync(rc_path, 'utf8')

function handleErr(reason) {
  while (reason.reason) {reason = reason.reason}
  console.log("Error " + reason.status + ": ", reason.message)
  if (reason.status == 404) {
    console.log("It seems your sessionid has expired. Let's log you in again.")
    return auth()
  } else {
    process.exit(1)
  }
}

function loadWfConfig() {
  try {
    fs.writeFileSync(rc_path, '{}', { flag: 'wx' }, function (err) {
      if (err) console.log('err')
      console.log("It's saved!");
    });
  } catch (err) {}
  const wfConfig = fs.readFileSync(rc_path, 'utf8')
  try {
    return JSON.parse(wfConfig)
  } catch(err) {
    console.log('Error parsing JSON string:', err)
    return {}
  }
}

function writeWfConfig(wfConfig) {
  fs.writeFileSync(rc_path, JSON.stringify(wfConfig), err => {
    if (err) {
        console.log('Could not write wfconfig file.', err)
    }
  })
}

function loadAliases() {
  aliases = loadWfConfig().aliases
  if (aliases === undefined) {
    return {}
  } else {
    return aliases
  }
}

function writeAliases(aliases) {
  wfConfig = loadWfConfig()
  wfConfig.aliases = aliases
  writeWfConfig(wfConfig)
}

function loadSessionid() {
  return loadWfConfig().sessionid
}

function writeSessionid(sessionid) {
  wfConfig = loadWfConfig()
  wfConfig.sessionid = sessionid
  writeWfConfig(wfConfig)
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

var withnote = false
var hiddencompleted = false 
var withid = false
var id = null
var aliases = loadAliases()

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

console.log("~~~~~~~~~~~~~~~~~")

var sessionid = loadSessionid()

if (argv.help) {
  printHelp()
} else if (rc && sessionid) {
  var wf = new Workflowy({sessionid: sessionid})
  wf.refresh()
  var command = argv._[0]
  if (command === 'capture') {

    console.log("• • • creating workflowy node • • •")
    var parentid = apply_alias(argv.parentid)
    var priority = argv.priority
    var name = argv.name
    var note = argv.note
    wf.create(parentid, name, priority, note).then(function (result) {
      console.log("created!")
    }, handleErr).fin(() => process.exit())
  } else if (command === 'tree') { console.log("• • • fetching workflowy tree • • •")
    depth = argv.depth || argv._[1] || 2
    id = apply_alias(argv.id)
    withnote = argv.withnote
    hiddencompleted = argv.hiddencompleted
    withid = argv.withid

    if (id) {
      wf.nodes.then(function (nodes) {
        var node = nodes.find(function (node) {
          return node.id == id
        })
        if (node) {
          recursivePrint(node, null, '', depth)
        } else {
          console.log('node ' + id + ' not found')
        }
      }, handleErr).fin(() => process.exit())
    } else {
      wf.outline.then(function (outline) {
        var rootnode = {
          nm: 'root',
          ch: outline,
          id: ''
        }
        recursivePrint(rootnode, null, '', depth)
      }, handleErr).fin(() => process.exit())
    }
  } else if (command === 'alias') {

    verb = argv._[1]
    if (aliases === undefined) {
      aliases = loadAliases()
      // console.log(aliases)
      if (aliases === undefined) {
        aliases = {}
      }
    }

    if (verb === 'add') {
      aliases[argv.name] = argv.id
      writeAliases(aliases)
      console.log("Added new alias '" + argv.name + "' for id '" + argv.id + "'")
    } else if (verb === 'remove') {
      delete aliases[argv.name]
      writeAliases(aliases)
      console.log("Removed alias for name '" + argv.name + "'")
    } else {
      console.log(aliases)
    }
  } else if (command === 'create_tree_demo') {
    console.log("🌲 🌲 🌲 create tree demo 🌲 🌲 🌲")
    wf.createTree('None', {
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
    })
  } else { console.log("• • • fetching workflowy data • • •")
    wf.meta.then(function (meta) {
      console.log("logged in as " + meta.settings.username)
      console.log(meta.projectTreeData.mainProjectTreeInfo.rootProjectChildren.length + " top-level nodes")
      if (command === 'meta') {
        console.log("meta", meta)
      } else {
        console.log("(to view commands, run with --help)")
      }
    }, handleErr).fin(() => process.exit())
  }
} else {
  console.log("No ~/.wfrc detected... starting authentication process...")
  auth()
}

function auth () {
  console.log("What is your workflowy login info? This will not be saved, merely used once to authenticate.")
  var schema = {
    properties: {
      email: {
        required: true
      }
    }
  }
  var deferred = Q.defer()
  let wf = new Workflowy({})
  prompt.start()
  prompt.get(schema, function (err, result) {
    if (err) {console.log('CANCELLED'); return}
    const email = result.email
    wf.getAuthType(email).then(authType => {
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
      prompt.get(schema, function (err, result2) {
        wf = new Workflowy({username: email, password: result2.password, code: result2.code})
        wf.login().then(function () {
          if (wf.sessionid) {
            deferred.resolve("Successfully wrote sessionid to ~/.wfrc")
          } else {
            deferred.reject(new Error("Failed to get sessionid"))
          }
        }).catch(err => {
          console.log("err", err)
        })
      })
    }, err => deferred.reject(err))
  })
  return deferred.promise.then(() => {
    console.log("wf.sessionid", wf.sessionid)
    console.log("Login successful.")
    try {
          writeSessionid(wf.sessionid)
          console.log("Successfully wrote sessionid to " + rc_path)
    } catch (e) {
          return console.log("Failed to write sessionid to " + rc_path)
    }
  }, err => {
    console.log("Failed to get sessionid. Check your username/password.")
  }).fin(() => {
    // console.log("reached newAuth fin")
    process.exit()
  })
}
