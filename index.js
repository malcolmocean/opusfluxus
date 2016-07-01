var _ = require('lodash')
var Q = require('q')
request = require('request')
var querystring = require('querystring')
var uuid = require('node-uuid')

var utils = {
  getTimestamp: function(meta) {
    return Math.floor((Date.now() - meta.projectTreeData.mainProjectTreeInfo.dateJoinedTimestampInSeconds) / 60)
  },
  makePollId: function() {
    return _.sample('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8).join('')
  },
  checkForErrors: function(arg) {
    var body, error, ref, resp
    resp = arg[0], body = arg[1]
    if ((300 <= (ref = resp.statusCode) && ref < 600)) {
      throw new Error("Error with request " + resp.request.uri.href + ": " + resp.statusCode)
    }
    if (error = body.error) {
      throw new Error("Error with request " + resp.request.uri.href + ": " + error)
    }
  }
}

module.exports = Workflowy = (function() {
  Workflowy.clientVersion = 16

  Workflowy.urls = {
    login: 'https://workflowy.com/accounts/login/',
    meta: "https://workflowy.com/get_initialization_data?client_version=" + Workflowy.clientVersion,
    update: 'https://workflowy.com/push_and_poll'
  }

  function Workflowy(auth, jar) {
    var self = this
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
      this._login = Q.ninvoke(this.request, 'post', {
        url: Workflowy.urls.login,
        form: {
          username: this.username,
          password: this.password
        }
      }).then(function(arg) {
        var body, resp
        resp = arg[0], body = arg[1]
        if (!((resp.statusCode === 302) && (resp.headers.location === "https://workflowy.com/"))) {
          utils.checkForErrors.apply(utils, arguments)
        }
        var jar = self.jar._jar.toJSON()
        for (c in jar.cookies) {
          if (jar.cookies[c].key === 'sessionid') {
            self.sessionid = jar.cookies[c].value
            break
          }
        }
      }).fail(function(err) {
        console.error("Error logging in: ", err)
        throw err
      })
    }
    this.refresh()
  }

  Workflowy.prototype.refresh = function() {
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
        return Q.ninvoke(_this.request, 'get', opts).then(function(arg) {
          var body, resp
          resp = arg[0], body = arg[1]
          utils.checkForErrors.apply(utils, arguments)
          return body
        }).fail(function(err) {
          console.error("Error fetching document root:", err)
          throw err
        })
      }
    }
    if (this.sessionid) {
      this.meta = Q.when(true, meta(this))
    } else {
      this.meta = this._login.then(meta(this))
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
        }).then(function(arg) {
          var body, resp
          resp = arg[0], body = arg[1]
          utils.checkForErrors.apply(utils, arguments)
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
    var condition, deferred, originalCondition
    if (!search) {

    } else if (_.isString(search)) {
      condition = function(node) {
        return node.nm === search
      }
    } else if (_.isRegExp(search)) {
      condition = function(node) {
        return search.test(node.nm)
      }
    } else if (_.isFunction(search)) {
      condition = search
    } else {
      (deferred = Q.defer()).reject(new Error('unknown search type'))
      return deferred
    }
    if (completed !== undefined && completed !== null) {
      originalCondition = condition
      condition = function(node) {
        return (_.has(node, 'cp') === !!completed) && originalCondition(node)
      }
    }
    if (parentCompleted !== undefined && parentCompleted !== null) {
      originalCondition2 = condition
      condition = function(node) {
        return (_.has(node, 'pcp') === !!completed) && originalCondition2(node)
      }
    }
    return this.nodes.then(function(nodes) {
      if (condition) {
        nodes = _.filter(nodes, condition)
      }
      return nodes
    })
  }

  Workflowy.prototype.delete = function(nodes) {
    var node, operations
    if (!_.isArray(nodes)) {
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
    if (!_.isArray(nodes)) {
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

  Workflowy.prototype.create = function (parentid, name, priority) {
    var projectid = uuid.v4()
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
          name: name
        },
        undo_data: {  
          previous_last_modified: 140101228,
        }
      }
    ]
    return this._update(operations).then((function(_this) {
      return function(arg) {
        // TODO: for a local workflowy client
        //       we'll want to update the local node
      }
    })(this))
  }

  Workflowy.prototype.update = function(nodes, newNames) {
    var i, node, operations
    if (!_.isArray(nodes)) {
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
// code adapted from https://github.com/mikerobe/workflowy
