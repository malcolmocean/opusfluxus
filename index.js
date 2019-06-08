var Q = require('q')
request = require('request')
var querystring = require('querystring')
var uuidv4 = require('uuid/v4')

var utils = {
  getTimestamp: function(meta) {
    return Math.floor((Date.now() - meta.projectTreeData.mainProjectTreeInfo.dateJoinedTimestampInSeconds) / 60)
  },
  makePollId: function() {
    return (Math.random() + 1).toString(36).substr(2, 8)
  },
  httpAbove299toError: function (arg) {
    var body, error, resp
    resp = arg[0], body = arg[1]
    var status = resp.statusCode
    if(!((status === 302) && (resp.headers.location === "https://workflowy.com/" || resp.headers.location === "/"))) {
      if ((300 <= status && status < 600)) {
        return Q.reject({status: status, message: "Error with request " + resp.request.uri.href + ": " + status})
      }
      if (error = body.error) {
        return Q.reject({status: status, message: "Error with request " + resp.request.uri.href + ": " + error})
      }
    }
    return arg
  },
}

module.exports = Workflowy = (function() {
  Workflowy.clientVersion = 18

  Workflowy.urls = {
    login: 'https://workflowy.com/ajax_login',
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
    if (!this.sessionid) {
      this.username = auth.username
      this.password = auth.password
      this._lastTransactionId = null
    }
  }

  Workflowy.prototype.login = function () {
    if (!this.sessionid) {
      return Q.ninvoke(this.request, 'post', {
        url: Workflowy.urls.login,
        form: {
          username: this.username,
          password: this.password
        }
      }).then(utils.httpAbove299toError)
      .then(arg => {
        var body = arg[1]
        if (/Please enter a correct username and password./.test(body)) {
          return Q.reject({status: 403, message: "Incorrect login info"})
        }
      }).then(arg => {
        var jar = this.jar._jar.toJSON()
        for (c in jar.cookies) {
          if (jar.cookies[c].key === 'sessionid') {
            this.sessionid = jar.cookies[c].value
            break
          }
        }
      }, err => Q.reject(err))
    }
    return this.refresh()
  }

  Workflowy.prototype.refresh = function () {
    function meta (_this) {
      return function() {
        var opts = {
          url: Workflowy.urls.meta
        }
        if (_this.sessionid) {
          opts.headers = {
            Cookie: 'sessionid='+_this.sessionid
          }
        }
        return Q.ninvoke(_this.request, 'get', opts)
        .then(utils.httpAbove299toError)
        .then(function(arg) {
          var body = arg[1]
          return body
        }).fail(function(err) {
          err.message = "Error fetching document root: " + err.message
          return Q.reject(err)
        })
      }
    }
    if (this.sessionid) {
      this.meta = Q.when(true, meta(this))
    } else {
      this.meta = this.login().then(meta(this))
    }
    this.outline = this.meta.then((function(_this) {
      return function(body) {
        var meta
        meta = body.projectTreeData.mainProjectTreeInfo
        _this._lastTransactionId = meta.initialMostRecentOperationTransactionId
        return meta.rootProjectChildren
      }
    })(this))
    return this.nodes = this.outline.then((function(_this) {
      return function(outline) {
        var addChildren, result
        result = []
        addChildren = function(arr, parentId, parentCompleted) {
          var child, children, j, len
          result.push.apply(result, arr)
          for (j = 0, len = arr.length; j < len; j++) {
            child = arr[j]
            child.parentId = parentId
            child.pcp = parentCompleted
            if (children = child.ch) {
              addChildren(children, child.id, child.cp || child.pcp)
            }
          }
        }
        addChildren(outline, 'None', false)
        return result
      }
    })(this))
  }

  Workflowy.prototype._update = function(operations) {
    return this.meta.then((function(_this) {
      return function(meta) {
        var clientId, j, len, operation, timestamp
        timestamp = utils.getTimestamp(meta)
        clientId = meta.projectTreeData.clientId
        for (j = 0, len = operations.length; j < len; j++) {
          operation = operations[j]
          operation.client_timestamp = 140101232 //timestamp
        }
        return Q.ninvoke(_this.request, 'post', {
          url: Workflowy.urls.update,
          form: {
            client_id: clientId,
            client_version: Workflowy.clientVersion,
            push_poll_id: utils.makePollId(),
            push_poll_data: JSON.stringify([
              {
                most_recent_operation_transaction_id: _this._lastTransactionId,
                operations: operations
              }
            ])
          },
          headers: {
            Cookie: 'sessionid='+_this.sessionid
          }
        })
        .then(utils.httpAbove299toError)
        .then(function(arg) {
          var resp = arg[0]
          var body = arg[1]
          _this._lastTransactionId = body.results[0].new_most_recent_operation_transaction_id
          return [resp, body, timestamp]
        })
      }
    })(this))
  }

  /*
   * @search [optional]
   * @returns an array of nodes that match the given string, regex or function
   */

  Workflowy.prototype.find = function(search, completed, parentCompleted) {
    var condition, deferred, originalCondition, originalCondition2
    if (!search) {

    } else if (typeof search == 'function') {
      condition = search
    } else if (typeof search == 'string') {
      condition = function(node) {
        return node.nm === search
      }
    } else if (search instanceof RegExp) {
      condition = function(node) {
        return search.test(node.nm)
      }
    } else {
      (deferred = Q.defer()).reject(new Error('unknown search type'))
      return deferred
    }
    if (typeof completed == 'boolean') {
      originalCondition = condition
      condition = function(node) {
        return (Boolean(node.cp) === !!completed) && originalCondition(node)
      }
    }
    if (typeof parentCompleted == 'boolean') {
      originalCondition2 = condition
      condition = function(node) {
        return Boolean(node.pcp) === !!parentCompleted && originalCondition2(node)
      }
    }
    return this.nodes.then(function(nodes) {
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
    operations = (function() {
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
    return this._update(operations).then((function(_this) {
      return function() {
        _this.refresh()
      }
    })(this))
  }

  Workflowy.prototype.complete = function(nodes, tf) {
    var node, operations
    if (tf == null) {
      tf = true
    }
    if (!Array.isArray(nodes)) {
      nodes = [nodes]
    }
    operations = (function() {
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
    return this._update(operations).then((function(_this) {
      return function(arg) {
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
      }
    })(this))
  }

  Workflowy.prototype.create = function (parentid, name, priority, note) {
    var projectid = uuidv4()
    var operations = [
      {  
        type: "create",
        data: {  
          projectid: projectid,
          parentid: parentid,
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
    .then((function(_this) {
      return function(arg) {
        // TODO: for a local workflowy client
        //       we'll want to update the local node
      }
    })(this))
  }

  Workflowy.prototype.update = function(nodes, newNames) {
    var i, node, operations
    if (!Array.isArray(nodes)) {
      nodes = [nodes]
      newNames = [newNames]
    }
    operations = (function() {
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
    return this._update(operations).then((function(_this) {
      return function(arg) {
        var body, j, len, resp, timestamp
        resp = arg[0], body = arg[1], timestamp = arg[2]
        for (i = j = 0, len = nodes.length; j < len; i = ++j) {
          node = nodes[i]
          node.nm = newNames[i]
          node.lm = timestamp
        }
      }
    })(this))
  }

  return Workflowy

})()

// ---
// generated by coffee-script 1.9.2
// code adapted from https://github.com/ruxi/workflowy
