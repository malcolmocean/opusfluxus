const WorkflowyClient = require('./index');
require('dotenv').config();

const capture = async ({ sessionId, parentId, text, note, priority } = {}) => {
  try {
    console.log('⦿ new workflowy connection');
    let wf = new WorkflowyClient({
      sessionid: process.env.SESSIONID || sessionId,
      // includeSharedProjects: config.includeSharedProjects,
    });
    console.log('⦿ refresh workflowy');
    await wf.refresh();
    console.log('⦿ creating workflowy node');

    const result = await wf.create(parentId, text, priority, note);
    console.log('⦿ created!');
    return result;
  } catch (err) {
    if (err.status == 404) {
      console.log('It seems your sessionid has expired.');
    } else {
      console.error(`Error ${err.status}:${err.message}`);
      throw err;
    }
  }
};

if (require.main === module) {
  capture();
} else {
  exports.capture = capture;
}
