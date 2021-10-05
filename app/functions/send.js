const { capture } = require('../../core/capture');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { text = '', note = '', priority = 0, ...rest } = JSON.parse(
    event.body
  );

  let { parentId, sessionId } = rest;

  if (!parentId || parentId.length === 0) {
    parentId = process.env.PARENTID;
  }

  if (!sessionId || sessionId.length === 0) {
    sessionId = process.env.SESSIONID;
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTION',
  };

  try {
    await capture({ parentId, sessionId, text, note, priority });
    return {
      headers,
      statusCode: 200,
      body: 'Sent!',
    };
  } catch (err) {
    return {
      headers,
      statusCode: 500,
      body: `Error ${err.status}:${err.message}`,
    };
  }
};
