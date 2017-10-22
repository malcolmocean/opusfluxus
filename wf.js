#! /usr/bin/env node
var Workflowy = require('./')
var exec = require('child_process').exec
var prompt = require('prompt')
var fs = require('fs')

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
    auth()
  } else {
    process.exit(1)
  }
}

function printHelp () {
  console.log("usage: wf <command> [<args>]\n")
  console.log("The commands currently available are:")
    console.log("\ttree n\t\t"+"print your workflowy nodes up to depth n (default: 2)")
    console.log("\tcapture\t\t"+"follow it by a ")
  console.log("")
}

function recursivePrint (node, prefix, depth) {
  console.log(prefix + node.nm)
  if (depth < 1) {return}
  var children = node.ch
  for (var i in children) {
    recursivePrint(children[i], prefix ? '  ' + prefix : '\u21b3 ', depth-1)
  }
}

function exit () {
  process.exit()
}

var regex = {
  sessionid: /sessionid: (\w+)/
}

console.log("~~~~~~~~~~~~~~~~~ ")
if (argv.help) {
  printHelp()
} else if (rc && regex.sessionid.test(rc)) {
  var sessionid = rc.match(regex.sessionid)[1]
  var wf = new Workflowy({sessionid: sessionid})

  var command = argv._[0]
  if (command === 'capture') {
    var parentid = argv.parentid
    var priority = argv.priority
    var name = argv.name
    console.log("• • • creating workflowy node • • •")
    wf.create(parentid, name, priority).then(function (result) {
      console.log("created!")
    }, handleErr).fin(exit)
  } else if (command === 'tree') {
    console.log("• • • fetching workflowy tree • • •")
    wf.outline.then(function (outline) {
      var rootnode = {
        nm: 'root',
        ch: outline
      }
      recursivePrint(rootnode, '', argv._[1] || 2)
    }, handleErr).fin(exit)
  } else {
    console.log("• • • fetching workflowy data • • •")
    wf.meta.then(function (meta) {
      console.log("logged in as " + meta.settings.username)
      console.log(meta.projectTreeData.mainProjectTreeInfo.rootProjectChildren.length + " top-level nodes")
      if (command === 'meta') {
        console.log("meta", meta)
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
  prompt.start()
  prompt.get(schema, function (err, result) {
    if (err) {console.log('CANCELLED'); return}
    var wf = new Workflowy({username: result.email, password: result.password})
    wf._login.then(function () {
      if (wf.sessionid) {
        console.log("Login successful.")
        fs.writeFile(rc_path, "sessionid: "+wf.sessionid+"\n", function (errf) {
          if (errf) {
            return console.log("Failed to write sessionid to ~/.wfrc")
          }
          console.log("Successfully wrote sessionid to ~/.wfrc")
        })
      } else {
        console.log("Failed to get sessionid. Check your username/password.")
      }
    }, handleErr).fin(exit)
  })
}
