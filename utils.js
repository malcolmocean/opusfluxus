const utils = {
  parseCookies: (cookies) =>
    Object.fromEntries(
      cookies
        .split('; ')
        .map((x) => x.split(/=(.*)$/, 2).map(decodeURIComponent))
    ),
  ensureArray: function (val) {
    return Array.isArray(val) ? val : [val];
  },
  getTimestamp: function (meta) {
    return Math.floor(
      (Date.now() -
        meta.projectTreeData.mainProjectTreeInfo.dateJoinedTimestampInSeconds) /
        60
    );
  },
  makePollId: function () {
    return (Math.random() + 1).toString(36).substr(2, 8);
  },
  httpAbove299toError: function ({ response: resp, body }) {
    var status = resp.statusCode;
    if (
      !(
        status === 302 &&
        ['/', 'https://workflowy.com/'].includes(resp.headers.location)
      )
    ) {
      if (300 <= status && status < 600) {
        throw new Error(
          `Error with request ${resp.request.uri.href}:${status}`
        );
      }
      if (body.error) {
        throw new Error(
          `Error with request ${resp.request.uri.href}:${body.error}`
        );
      }
    }
    return;
  },
  findAllBreadthFirst(topLevelNodes, search, maxResults) {
    const queue = [].concat(topLevelNodes);
    let nodes = [];
    while ((node = queue.shift())) {
      if (node && search(node)) {
        nodes.push(node);
      } else if (node && node.ch && node.ch.length) {
        queue.push(...node.ch);
      }
      if (nodes.length == maxResults) {
        break;
      }
    }
    return nodes;
  },
};

module.exports = utils;
