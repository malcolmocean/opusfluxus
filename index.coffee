_ = require 'lodash'
Q = require 'q'
request = require 'request'
# FileCookieStore = require 'tough-cookie-filestore'


utils =
  getTimestamp: (meta) ->
    Math.floor (Date.now() - meta.projectTreeData.mainProjectTreeInfo.dateJoinedTimestampInSeconds) / 60

  makePollId: ->
    _.sample('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8).join('')

  checkForErrors: ([resp, body]) ->
    if 300 <= resp.statusCode < 600
      throw new Error "Error with request #{resp.request.uri.href}: #{resp.statusCode}"
    if error = body.error
      throw new Error "Error with request #{resp.request.uri.href}: #{error}"
    return

module.exports = class Workflowy
  @clientVersion: 14

  @urls:
    login: 'https://workflowy.com/accounts/login/'
    meta: "https://workflowy.com/get_initialization_data?client_version=#{Workflowy.clientVersion}"
    update: 'https://workflowy.com/push_and_poll'

  constructor: (@username, @password) ->
    # @jar = request.jar new FileCookieStore('cookies.jar')
    @jar = request.jar()
    @request = request.defaults {@jar, json: true}

    @_lastTransactionId = null

    login = Q.ninvoke @request,
      'post'
      url: Workflowy.urls.login
      form: {@username, @password}
    .then ([resp, body]) ->
      unless (resp.statusCode is 302) and (resp.headers.location is "https://workflowy.com/")
        utils.checkForErrors arguments...
      return
    .fail (err) ->
      console.error "Error logging in: ", err
      throw err

    @meta = login.then =>
      Q.ninvoke @request,
        'get'
        url: Workflowy.urls.meta
      .then ([resp,body]) ->
        utils.checkForErrors arguments...
        body
      .fail (err) ->
        console.error "Error fetching document root:", err
        throw err

    @outline = @meta.then (body) =>
      meta = body.projectTreeData.mainProjectTreeInfo
      @_lastTransactionId = meta.initialMostRecentOperationTransactionId
      meta.rootProjectChildren

    @nodes = @outline.then (outline) =>
      result = []

      addChildren = (arr) ->
        result.push arr...
        addChildren children for child in arr when children = child.ch
        return

      addChildren outline
      result

  ###
  # @search [optional]
  # @returns an array of nodes that match the given string, regex or function
  ###
  find: (search) ->
    unless search
    else if _.isString search
      condition = (node) -> node.nm is search
    else if _.isRegExp search
      condition = (node) -> search.test node.nm
    else if _.isFunction search
      condition = search
    else
      (deferred = Q.defer()).reject new Error 'unknown search type'
      return deferred

    @nodes.then (nodes) ->
      nodes = _.filter nodes, condition if condition
      nodes

  update: (nodes, newNames) ->
    unless _.isArray nodes
      nodes = [nodes]
      newNames = [newNames]

    @meta.then (meta) =>
      timestamp = utils.getTimestamp meta
      {clientId} = meta.projectTreeData

      operations = for node, i in nodes
        type: 'edit',
        data:
          projectid: node.id
          name: newNames[i]
        client_timestamp: timestamp
        undo_data:
          previous_last_modified: node.lm
          previous_name: node.nm

      Q.ninvoke @request,
        'post'
        url: Workflowy.urls.update
        form:
          client_id: clientId
          client_version: Workflowy.clientVersion
          push_poll_id: utils.makePollId()
          push_poll_data: JSON.stringify [
            most_recent_operation_transaction_id: @_lastTransactionId
            operations: operations
          ]
      .then ([resp, body]) ->
        utils.checkForErrors arguments...

        @_lastTransactionId = body.results[0].new_most_recent_operation_transaction_id

        # now update the nodes
        for node, i in nodes
          node.nm = newNames[i]
          node.lm = timestamp

        return
