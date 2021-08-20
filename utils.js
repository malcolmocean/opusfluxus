const Q = require('q');

const utils = {
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
  httpAbove299toError: function (arg) {
    const [resp, body] = arg;
    var status = resp.statusCode;
    if (
      !(
        status === 302 &&
        (resp.headers.location === 'https://workflowy.com/' ||
          resp.headers.location === '/')
      )
    ) {
      if (300 <= status && status < 600) {
        return Q.reject({
          status: status,
          message: `Error with request ${resp.request.uri.href}:${status}`,
          body: body,
        });
      }
      if (body.error) {
        return Q.reject({
          status: status,
          message: `Error with request ${resp.request.uri.href}:${error}`,
          body: body,
        });
      }
    }
    return arg;
  },
};

module.exports = utils;
