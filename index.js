const fetch = require('node-fetch')
const request = require('request')
const querystring = require('querystring')
const uuidv4 = require('uuid/v4')

var utils = {
  getTimestamp: function (meta) {
    return Math.floor((Date.now() - meta.projectTreeData.mainProjectTreeInfo.dateJoinedTimestampInSeconds) / 60)
  },
  makePollId: function () {
    return (Math.random() + 1).toString(36).substr(2, 8)
  },
  httpAbove299toError_OLD: async function (arg) {
    var body, error, resp
    resp = arg[0], body = arg[1]
    var status = resp.statusCode
    if(!((status === 302) && (resp.headers.location === "https://workflowy.com/" || resp.headers.location === "/"))) {
      if ((300 <= status && status < 600)) {
        throw {status: status, message: "Error with request " + resp.request.uri.href + ": " + status, body: body}
      }
      if (error = body.error) {
        throw {status: status, message: "Error with request " + resp.request.uri.href + ": " + error, body: body}
      }
    }
    return arg
  },
  httpAbove299toError: async response => {
    const status = response.status
    const location = response.headers.location
    if (status < 300) {return response}
    if (status == 302 && (location == "https://workflowy.com/" || location === "/")) {return response}
    const errorBody = await response.text()
    if ((300 <= status && status < 600)) {
      throw {status: status, message: "Error with request " + response.url + ": " + status, body: errorBody}
    }
    // does workflowy ever send {status: 200, {body: {error: "some error"}}}??
    // const errorJson = JSON.parse(errorBody)
    // but with a try/catch
    // if (error = body.error) {
    //   throw {status: status, message: "Error with request " + response.url + ": " + error, body: body}
    // }
    return response
  }
}

module.exports = Workflowy = (function() {
  Workflowy.clientVersion = 18

  Workflowy.urls = {
    newAuth: 'https://workflowy.com/api/auth',
    // login: 'https://workflowy.com/ajax_login',
    // login: 'https://workflowy.com/accounts/login/',
    meta: "https://workflowy.com/get_initialization_data?client_version=" + Workflowy.clientVersion,
    update: 'https://workflowy.com/push_and_poll'
  }

  function Workflowy(auth, jar) {
    this.jar = jar ? request.jar(jar) : request.jar()
    this.request = request.defaults({
      jar: this.jar,
      json: true
    })
    this.sessionid = auth.sessionid
    this.includeSharedProjects = auth.includeSharedProjects
    this.resolveMirrors = auth.resolveMirrors !== false // default true, since mirrors are new so there's no expected behavior and most users will want this
    if (!this.sessionid) {
      this.username = auth.username || auth.email
      this.password = auth.password || ''
      this.code = auth.code || ''
      this._lastTransactionId = null
    }
  }

  Workflowy.prototype.getAuthType = function (email, options={}) {
    TODO = 'should that be form or body or what?'
    fetch(Workflowy.urls.newAuth, {
      method: 'POST',
      form: {
        email: email,
        allowSignup: options.allowSignup || false,
      }
    }).then(utils.httpAbove299toError)
    .then(result => {
      console.log("========================================")
      console.log("result", result)
      console.log("result[1]", result[1])
      console.log("========================================")
      return result[1].authType
    })
  }

  Workflowy.prototype.login = function () {
    if (!this.sessionid) {
      return fetch(Workflowy.urls.newAuth, {
        method: 'POST',
        form: {
          email: this.username,
          password: this.password || '',
          code: this.code || '',
        }
      })
      .then(utils.httpAbove299toError)
      .then(arg => {
        var body = arg[1]
        if (/Please enter a correct username and password./.test(body)) {
          throw {status: 403, message: "Incorrect login info"}
        }
      }).then(arg => {
        var jar = this.jar._jar.toJSON()
        for (c in jar.cookies) {
          if (jar.cookies[c].key === 'sessionid') {
            this.sessionid = jar.cookies[c].value
            break
          }
        }
      })
    }
    return this.refresh()
  }

  Workflowy.prototype.refresh = async function () {
    try {

    let errorIfAny
    if (!this.sessionid) {
      await this.login().catch(err => {
        err.message = "Error logging into workflowy: " + err.message
        errorIfAny = err
      })
    }
    const meta = await fetch(Workflowy.urls.meta, {
      method: 'GET',
      headers: {
        'Cookie': `sessionid=${this.sessionid}-NOPE;`,
      },
    })
    .then(utils.httpAbove299toError)
    .then(response => response.json())
    .catch(err => {
      err.message = "Error fetching workflowy root: " + err.message
      errorIfAny = err
    })
    if (errorIfAny) {
      this.meta = Promise.reject(errorIfAny)
      this.outline = Promise.reject(errorIfAny)
      this.nodes = Promise.reject(errorIfAny)
    } else {
      if (this.includeSharedProjects) {
        Workflowy.transcludeShares(meta)
      }
      const mpti = meta.projectTreeData.mainProjectTreeInfo
      this._lastTransactionId = mpti.initialMostRecentOperationTransactionId
      const outline = mpti.rootProjectChildren
      // outline.splice(2, 1)
      if (this.resolveMirrors) {
        Workflowy.transcludeMirrors(outline)
      }
      const nodes = Workflowy.pseudoFlattenUsingSet(outline)
      this.meta = Promise.resolve(meta)
      this.outline = Promise.resolve(outline)
      this.nodes = Promise.resolve(nodes)
    }
    } catch (err) {
      console.log("refresh internal error", err)
    }
  }

  Workflowy.prototype._update = function (operations) {
    return this.meta.then(meta => {
      var clientId, j, len, operation, timestamp
      timestamp = utils.getTimestamp(meta)
      clientId = meta.projectTreeData.clientId
      for (j = 0, len = operations.length; j < len; j++) {
        operation = operations[j]
        operation.client_timestamp = timestamp
      }
      return fetch(Workflowy.urls.update, {
        method: 'POST',
        form: {
          client_id: clientId,
          client_version: Workflowy.clientVersion,
          push_poll_id: utils.makePollId(),
          push_poll_data: JSON.stringify([
            {
              most_recent_operation_transaction_id: this._lastTransactionId,
              operations: operations
            }
          ])
        },
        headers: {
          Cookie: 'sessionid='+this.sessionid
        }
      })
      .then(utils.httpAbove299toError)
      .then(arg => {
        var resp = arg[0]
        var body = arg[1]
        this._lastTransactionId = body.results[0].new_most_recent_operation_transaction_id
        return [resp, body, timestamp]
      })
    })
  }

  function originalIdSomewhereElse (node) {
    const originalId = node.originalId || node.mirror && node.mirror.originalId
    if (originalId) {
      return originalId
    }
  }

  /* modifies the tree so that shared projects are added in */
  Workflowy.transcludeShares = function (meta) {
    const howManyShares = meta.projectTreeData.auxiliaryProjectTreeInfos.length
    if (!howManyShares) {return}
    const auxProjectsByShareId = {}
    meta.projectTreeData.auxiliaryProjectTreeInfos.map(x => {
      if (x && x.rootProject && x.rootProject.shared) {
        auxProjectsByShareId[x.rootProject.shared.share_id] = x
      }
    })
    const topLevelNodes = meta.projectTreeData.mainProjectTreeInfo.rootProjectChildren
    const shareEntryPoints = findAllBreadthFirst(topLevelNodes, node => node.as, howManyShares)
    shareEntryPoints.map(node => {
      const auxP = auxProjectsByShareId[node.as]
      if (!auxP) {return} // happens with certain templates
      node.nm = auxP.rootProject.nm
      node.ch = auxP.rootProjectChildren
    })
  }

  Workflowy.getNodesByIdMap = function (outline) {
    const map = {}
    const mapChildren = (arr) => {
      arr.map(node => map[node.id] = node)
      for (let j = 0, len = arr.length; j < len; j++) {
        arr[j].ch && mapChildren(arr[j].ch)
      }
    }
    mapChildren(outline)
    return map
  }

  /* modifies the tree so that mirror bullets are in all places they should be */
  // uncomment the ignoreIds lines to make it not infinitely recurse
  Workflowy.transcludeMirrors = function (outline) {
    const nodesByIdMap = Workflowy.getNodesByIdMap(outline)
    const transcludeChildren = (arr) => {
    // const transcludeChildren = (arr, ignoreIds) => {
      // ignoreIds = JSON.parse(JSON.stringify(ignoreIds)) // jsoncopy
      for (let j = 0, len = arr.length; j < len; j++) {
        const node = arr[j]
        // ignoreIds[node.id] = true
        const originalId = node.metadata && (node.metadata.originalId || node.metadata.mirror && node.metadata.mirror.originalId)
        if (originalId) {
          // if (ignoreIds[originalId]) {return}
          const originalNode = nodesByIdMap[originalId]
          if (originalNode) {
            arr[j] = originalNode
          } else {
            // shouldn't happen; did when I was doing weird stuff in testing
          }
        } else { // only do children when considering in original situation
          arr[j].ch && transcludeChildren(arr[j].ch)
          // arr[j].ch && transcludeChildren(arr[j].ch, ignoreIds)
        }
      }
    }
    try {
      transcludeChildren(outline, {})
      // transcludeChildren(outline, {})
      // transcludeChildren(outline, {})
    } catch (e) {
      console.log("========================================")
      console.log(e)
      console.log(e.name)
    }
  }

  Workflowy.pseudoFlattenUsingSet = function (outline) {
    const set = new Set()
    const addChildren = (arr, parentId, parentCompleted) => {
      var child, children, j, len
      for (j = 0, len = arr.length; j < len; j++) {
        const setHasAlready = set.has(arr[j]) // otherwise mirrors can cause infinite recursion
        set.add(arr[j])
        child = arr[j]
        child.parentId = parentId
        // TODO = "get this to use original parentId?"
        if (typeof child.pcp == 'undefined') {
          child.pcp = parentCompleted
        } else {
          child.pcp = child.pcp & parentCompleted // for mirrors
        }
        const children = child.ch
        if (children && children.length && !setHasAlready) {
          addChildren(children, child.id, child.cp || child.pcp)
        }
      }
    }
    addChildren(outline, 'None', false)
    return [...set] // array
  }

  function findAllBreadthFirst (topLevelNodes, search, maxResults) {
    const queue = [].concat(topLevelNodes)
    let nodes = []
    while (node = queue.shift()) {
      if (node && search(node)) {
        nodes.push(node)
      } else if (node && node.ch && node.ch.length) {
        queue.push(...node.ch)
      }
      if (nodes.length == maxResults) {
        break
      }
    }
    return nodes
  }

  /*
   * @search [optional]
   * @returns an array of nodes that match the given string, regex or function
   */

  Workflowy.prototype.find = function(search, completed, parentCompleted) {
    let condition, deferred, originalCondition, originalCondition2
    if (typeof search == 'function') {
      condition = search
    } else if (typeof search == 'string') {
      condition = node => node.nm === search
    } else if (search instanceof RegExp) {
      condition = node => search.test(node.nm)
    } else if (search) {
      throw new Error('unknown search type')
    }
    if (typeof completed == 'boolean') {
      originalCondition = condition
      condition = node => (Boolean(node.cp) === !!completed) && originalCondition(node)
    }
    if (typeof parentCompleted == 'boolean') {
      originalCondition2 = condition
      condition = node => Boolean(node.pcp) === !!parentCompleted && originalCondition2(node)
    }
    return this.nodes.then(nodes => {
      if (condition) {
        nodes = nodes.filter(condition)
      }
      return nodes
    })
  }

  Workflowy.prototype.delete = function(nodes) {
    var node, operations
    if (Array.isArray(nodes)) {
      nodes = [nodes]
    }
    operations = (() => {
      var j, len, results
      results = []
      for (j = 0, len = nodes.length; j < len; j++) {
        node = nodes[j]
        results.push({
          type: 'delete',
          data: {
            projectid: node.id
          },
          undo_data: {
            previous_last_modified: node.lm,
            parentid: node.parentId,
            priority: 5
          }
        })
      }
      return results
    })()
    return this._update(operations).then(() => {this.refresh(); return})
  }

  Workflowy.prototype.complete = function(nodes, tf) {
    var node, operations
    if (tf == null) {
      tf = true
    }
    if (!Array.isArray(nodes)) {
      nodes = [nodes]
    }
    operations = (() => {
      var j, len, results
      results = []
      for (j = 0, len = nodes.length; j < len; j++) {
        node = nodes[j]
        results.push({
          type: tf ? 'complete' : 'uncomplete',
          data: {
            projectid: node.id
          },
          undo_data: {
            previous_last_modified: node.lm,
            previous_completed: tf ? false : node.cp
          }
        })
      }
      return results
    })()
    return this._update(operations).then(arg => {
      var body, i, j, len, resp, timestamp
      resp = arg[0], body = arg[1], timestamp = arg[2]
      for (i = j = 0, len = nodes.length; j < len; i = ++j) {
        node = nodes[i]
        if (tf) {
          node.cp = timestamp
        } else {
          delete node.cp
        }
      }
    })
  }

  Workflowy.prototype.createTrees = async function (parentid, nodeArray, priority) {
    if (typeof parentid !== 'string') {throw new Error( "must provide parentid (use 'None' for top-level)")}
    for (let node of nodeArray) {
      await this.createTree(parentid, node, priority)
    }
  }

  Workflowy.prototype.createTree = async function (parentid, topNode, priority) {
    if (typeof parentid !== 'string') {throw new Error( "must provide parentid (use 'None' for top-level)")}
    return this.create(parentid, topNode.nm, priority, topNode.no)
    .then(newTopNode => {
      topNode.id = newTopNode.id
      if (!topNode.ch || !topNode.ch.length) {
        return
      }
      return this.createTrees(topNode.id, topNode.ch, 1000000)
    }).then(() => topNode)
  }

  Workflowy.prototype.create = function (parentid, name, priority, note) {
    var projectid = uuidv4()
    var operations = [
      {  
        type: "create",
        data: {  
          projectid: projectid,
          parentid: parentid || 'None',
          priority: priority || 0 // 0 adds as first child, 1 as second, etc
        },
      },
      {  
        type: "edit",
        data: {  
          projectid: projectid,
          name: name,
          description: note,
        }
      }
    ]
    return this._update(operations)
    .then(utils.httpAbove299toError)
    .then(() => ({id: projectid}))
  }

  Workflowy.prototype.update = function(nodes, newNames) {
    var i, node, operations
    if (!Array.isArray(nodes)) {
      nodes = [nodes]
      newNames = [newNames]
    }
    operations = (() => {
      var j, len, results
      results = []
      for (i = j = 0, len = nodes.length; j < len; i = ++j) {
        node = nodes[i]
        results.push({
          type: 'edit',
          data: {
            projectid: node.id,
            name: newNames[i]
          },
          undo_data: {
            previous_last_modified: node.lm,
            previous_name: node.nm
          }
        })
      }
      return results
    })()
    return this._update(operations).then(arg => {
      var body, j, len, resp, timestamp
      resp = arg[0], body = arg[1], timestamp = arg[2]
      for (i = j = 0, len = nodes.length; j < len; i = ++j) {
        node = nodes[i]
        node.nm = newNames[i]
        node.lm = timestamp
      }
    })
  }

  return Workflowy
})()

const wf = require('./wf.js')
if ('run' in wf) { // avoid circular dependency
  module.exports.cli = wf.run
  module.exports.loadWfConfig = wf.loadWfConfig
  module.exports.writeWfConfig = wf.writeWfConfig
}

// ---
// generated by coffee-script 1.9.2
// code adapted from https://github.com/ruxi/workflowy
