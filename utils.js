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
    return arg;
  },
};

module.exports = utils;
