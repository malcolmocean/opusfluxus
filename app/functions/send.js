const { capture } = require('../../capture');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const {
    parentId = process.env.PARENTID,
    name = '',
    note = '',
    priority = 0,
  } = JSON.parse(event.body);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTION',
  };

  try {
    const result = await capture({ parentId, name, note, priority });
    return {
      headers,
      statusCode: 200,
      body: 'Created.',
    };
  } catch (err) {
    return {
      headers,
      statusCode: 500,
      body: err,
    };
  }
};
