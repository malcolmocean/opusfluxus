#! /usr/bin/env node
var Workflowy = require('./')
var exec = require('child_process').exec
var prompt = require('prompt')
var fs = require('fs')
var Q = require('q')

var argv = require('minimist')(process.argv.slice(2))

var userhome = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']
var rc_path = userhome+"/.wfrc"

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

function loadAliases() {
  try {
    fs.writeFileSync('./aliases.json', '{}', { flag: 'wx' }, function (err) {
      if (err) console.log('err')
      console.log("It's saved!");
    });
  } catch (err) {}
  const aliases = fs.readFileSync('./aliases.json', 'utf8')
  try {
    return JSON.parse(aliases)
  } catch(err) {
    console.log('Error parsing JSON string:', err)
    return {}
  }
}

function writeAliases() {
  fs.writeFileSync('./aliases.json', JSON.stringify(aliases), err => {
    if (err) {
        console.log('Could not write alias file.', err)
    }
  })
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

function exit () {
  process.exit()
}

function apply_alias(id) {
  if (id != undefined && !id.match("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")) {
    // id not uuid, used alias
    return aliases[id]
  }
  return id
}

var regex = {
  sessionid: /sessionid: (\w+)/
}

console.log("~~~~~~~~~~~~~~~~~")


if (argv.help) {
  printHelp()
} else if (rc && regex.sessionid.test(rc)) {
  var sessionid = rc.match(regex.sessionid)[1]
  var wf = new Workflowy({sessionid: sessionid})

  var command = argv._[0]
  if (command === 'capture') {

    console.log("• • • creating workflowy node • • •")
    var parentid = apply_alias(argv.parentid)
    var priority = argv.priority
    var name = argv.name
    var note = argv.note
    wf.create(parentid, name, priority, note).then(function (result) {
      console.log("created!")
    }, handleErr).fin(exit)

  } else if (command === 'tree') {

    console.log("• • • fetching workflowy tree • • •")
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
      }, handleErr).fin(exit)
    } else {
      wf.outline.then(function (outline) {
        var rootnode = {
          nm: 'root',
          ch: outline,
          id: ''
        }
        recursivePrint(rootnode, null, '', depth)
      }, handleErr).fin(exit)
    }
  } else if (command === 'alias') {

    verb = argv._[1]
    if (aliases === undefined) {
      aliases = loadAliases()
      console.log(aliases)
      if (aliases === undefined) {
        aliases = {}
      }
    }

    if (verb === 'add') {
      aliases[argv.name] = argv.id
      writeAliases()
      console.log("Added new alias '" + argv.name + "' for id '" + argv.id + "'")
    } else if (verb === 'remove') {
      delete aliases[argv.name]
      writeAliases()
      console.log("Removed alias for name '" + argv.name + "'")
    } else {
      console.log(aliases)
    }
    exit()

  } else {

    console.log("• • • fetching workflowy data • • •")


    wf.meta.then(function (meta) {
      console.log("logged in as " + meta.settings.username)
      console.log(meta.projectTreeData.mainProjectTreeInfo.rootProjectChildren.length + " top-level nodes")
      if (command === 'meta') {
        console.log("meta", meta)
      } else {
        console.log("(to view commands, run with --help)")
      }
    }, handleErr).fin(exit)
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
      },
      password: {
        required: true,
        hidden: true
      }
    }
  }
  var deferred = Q.defer()
  prompt.start()
  prompt.get(schema, function (err, result) {
    if (err) {console.log('CANCELLED'); return}
    var wf = new Workflowy({username: result.email, password: result.password})
    wf._login.then(function () {
      if (wf.sessionid) {
        console.log("Login successful.")
        try {
          fs.writeFileSync(rc_path, "sessionid: "+wf.sessionid+"\n")
          console.log("Successfully wrote sessionid to ~/.wfrc")
          deferred.resolve("Successfully wrote sessionid to ~/.wfrc")
        } catch (e) {
          return console.log("Failed to write sessionid to ~/.wfrc")
          deferred.reject(new Error("Failed to write sessionid to ~/.wfrc"))
        }
      } else {
        console.log("Failed to get sessionid. Check your username/password.")
        deferred.reject(new Error("Failed to get sessionid"))
      }
    }, handleErr).fin(exit)
  })
  return deferred.promise
}
