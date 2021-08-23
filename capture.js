const WorkflowyClient = require('./index');
require('dotenv').config();

function handleErr(reason) {
  while (reason.reason) {
    reason = reason.reason;
  }
  if (reason.status == 404) {
    console.log('It seems your sessionid has expired.');
  } else {
    console.log(`Error ${reason.status}:${reason.message}`);
    process.exit(1);
  }
}

const capture = async ({
  parentId = '401a6a24-6edd-c695-b5a6-46c2bf9a73ac',
  name = `test node ${new Date()}`,
  note = 'hm',
  priority = 0,
} = {}) => {
  console.log('• • • new workflowy cxn • • •');

  let wf = new WorkflowyClient({
    sessionid: process.env.SESSIONID,
    // includeSharedProjects: config.includeSharedProjects,
  });
  console.log('• • • refresh workflowy • • •');
  await wf.refresh();
  console.log('• • • creating workflowy node • • •');

  const result = await wf.create(parentId, name, priority, note);
  console.log('created!');
  return result;
};

if (require.main === module) {
  capture();
} else {
  exports.capture = capture;
}
