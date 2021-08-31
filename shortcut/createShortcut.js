const fs = require('fs');

const {
  ICON: { COLORS, GLYPHS },
} = require('@joshfarrant/shortcuts-js/meta');

const {
  actionOutput,
  buildShortcut,
  withVariables,
} = require('@joshfarrant/shortcuts-js');

const {
  askWhenRun,
  clipboard,
  shortcutInput,
  currentDate,
} = require('@joshfarrant/shortcuts-js/variables');

const { getContentsOfURL, URL } = require('@joshfarrant/shortcuts-js/actions');

const sessionId = '';
const parentId = '';

const actions = [
  URL({
    url: 'https://deploy-preview-1--send-to-workflowy.netlify.app/.netlify/functions/send',
  }),
  getContentsOfURL({
    headers: {},
    method: 'POST',
    requestBodyType: 'JSON',
    requestBody: {
      parentId,
      sessionId,
      text: shortcutInput,
      note: '',
      priority: 0,
    },
  }),
];

const shortcut = buildShortcut(actions, {
  icon: { color: COLORS.BLUE_GRAY, glyph: GLYPHS.TARGET },
});

fs.writeFile('send-to-workflowy.shortcut', shortcut, (err) => {
  if (err) {
    console.error('Something went wrong :(', err);
    return;
  }
  console.log('Shortcut created!');
});
