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
var withnote = false
var hiddencompleted = false 
var withid = false
var id = null

function onErr (err) {
  console.error(err)
  return 1
}

function handleErr(after) {
  return function (err, result) {
    if (err) {return onErr(err)}
    if (!result) {return onErr("no result")}
    if (result.errors) {
      for (var e in result.errors) {
        console.error(e)
      }
      return 1
    }
    after(result)
  }
}

function printHelp () {
  console.log("usage: wf <command> [<args>]\n")
  console.log("The commands currently available are:")
    console.log("\ttree n\t\t"+"print your workflowy nodes up to depth n (default: 2)")
    console.log("\t\tid=<id>\t\t"+"print sub nodes under the <id> (default: root)")
    console.log("\t\twithnote\t\t"+"print the note of nodes (default: false)")
    console.log("\t\thiddencompleted\t\t"+"hide the completed lists (default: false)")
    console.log("\t\twithid\t\t"+"print id of nodes (default: false)")
    console.log("\tcapture\t\t"+"follow it by a ")
  console.log("")
}

function getObject(theObject, id) {
    var result = null;
    if(theObject instanceof Array) {
        for(var i = 0; i < theObject.length; i++) {
            result = getObject(theObject[i], id);
            if (result) {
                break;
            }   
        }
    }
    else
    {
        for(var prop in theObject) {
            if(prop == 'id') {
                if(theObject[prop] == id) {
                    return theObject;
                }
            }
            if(theObject[prop] instanceof Object || theObject[prop] instanceof Array) {
                result = getObject(theObject[prop], id);
                if (result) {
                    break;
                }
            } 
        }
    }
    return result;
}

function recursivePrint (node, prefix, depth) {
  var println = null 

  if (withnote && node.no)
   println = prefix + node.nm + '\n'+ prefix.replace('\u21b3',' ')+ node.no
  else
   println = prefix + node.nm

  if (withid) println += '\n' + prefix.replace('\u21b3',' ') + node.id

  if (hiddencompleted && node.cp) println = null

  if (println) console.log(println)

  if (depth < 1) {return}

  var children = node.ch
  for (var i in children) {
    recursivePrint(children[i], prefix ? '  ' + prefix : '\u21b3 ', depth-1)
  }
}

var regex = {
  sessionid: /sessionid: (\w+)/
}

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
    console.log("• • • creating workflowy node • • •");
    wf.create(parentid, name, priority).then(function (result) {
      console.log("created!")
    })
  } else if (command === 'tree') {
    console.log("• • • fetching workflowy data • • •");
    id = argv.id
    withnote = argv.withnote
    hiddencompleted = argv.hiddencompleted
    withid = argv.withid
    wf.outline.then(function (outline) {
    var rootnode = {
        nm: 'root',
        ch: outline,
        id: 'N/A'
      }	
    if (id != null) 
     {
      var objnode = getObject(outline, id)
          rootnode = {
           nm: objnode.nm,
           ch: objnode.ch,
           id: objnode.id
          }
      }
      recursivePrint(rootnode, '', argv._[1] || 2)
    })
  } else {
    wf.meta.then(function (meta) {
      console.log("logged in as " + meta.settings.username)
      console.log(meta.projectTreeData.mainProjectTreeInfo.rootProjectChildren.length + " top-level nodes")
    })
  }
} else {
  // TODO handle the situation where the cookie has expired
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
      var wf = new Workflowy({username: result.email, password: result.password})
      wf._login.then(function () {
        fs.writeFile(rc_path, "sessionid: "+wf.sessionid+"\n", function (errf) {
          if (errf) { return onErr(errf); }
          console.log("Successfully wrote sessionid to ~/.wfrc")
        })
      })
    })
}
