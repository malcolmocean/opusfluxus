const uuidv4 = require('uuid/v4');

const utils = require('./utils');

const { Readable } = require('stream');
const { FormData } = require('formdata-node');
const { FormDataEncoder } = require('form-data-encoder');
const fetch = require('node-fetch');

const CLIENT_VERSION = 18;
const URLS = {
  newAuth: 'https://workflowy.com/api/auth',
  // login: 'https://workflowy.com/ajax_login',
  // login: 'https://workflowy.com/accounts/login/',
  meta: `https://workflowy.com/get_initialization_data?client_version=${CLIENT_VERSION}`,
  update: 'https://workflowy.com/push_and_poll',
};

module.exports = class WorkflowyClient {
  constructor(auth) {
    this.sessionid = auth.sessionid;
    this.includeSharedProjects = auth.includeSharedProjects;
    this.resolveMirrors = auth.resolveMirrors !== false; // default true, since mirrors are new so there's no expected behavior and most users will want this
    if (!this.sessionid) {
      this.username = auth.username || auth.email;
      this.password = auth.password || '';
      this.code = auth.code || '';
      this._lastTransactionId = null;
    }
  }
  async getAuthType(email, options = {}) {
    const form = new FormData();
    form.set('email', email);
    form.set('allowSignup', options.allowSignup || false);
    form.set('push_poll_id', utils.makePollId());
    form.set('push_poll_data', pushPollData);

    const encoder = new FormDataEncoder(form);
    const response = await fetch(URLS.newAuth, {
      method: 'POST',
      body: Readable.from(encoder),
      headers: {
        ...encoder.headers,
        Cookie: `sessionid=${this.sessionid}`,
      },
    });
    const body = await response.json();

    utils.httpAbove299toError({ response, body });

    return body.authType;
  }
  async login() {
    if (!this.sessionid) {
      const form = new FormData();
      form.set('email', clientId);
      form.set('password', CLIENT_VERSION);
      form.set('code', utils.makePollId());

      const encoder = new FormDataEncoder(form);
      const response = await fetch(URLS.newAuth, {
        method: 'POST',
        body: Readable.from(encoder),
        headers: {
          ...encoder.headers,
          Cookie: `sessionid=${this.sessionid}`,
        },
      });
      const body = await response.json();

      utils.httpAbove299toError({ response, body });

      if (/Please enter a correct username and password./.test(body)) {
        throw Error('Incorrect login info');
      }
      return body;
    }
    return this.refresh();
  }
  async refresh() {
    if (!this.sessionid) {
      await this.login();
    }

    this.meta = async () => {
      try {
        const response = await fetch(URLS.meta, {
          method: 'GET',
          headers: this.sessionid
            ? {
                Cookie: `sessionid=${this.sessionid}`,
              }
            : {},
        });

        const body = await response.json();
        utils.httpAbove299toError({ response, body });
        return body;
      } catch (err) {
        console.error(`Error fetching document root: ${err.message}`);
      }
    };

    const meta = await this.meta();

    if (this.includeSharedProjects) {
      WorkflowyClient.transcludeShares(meta);
    }
    const mpti = meta.projectTreeData.mainProjectTreeInfo;
    this._lastTransactionId = mpti.initialMostRecentOperationTransactionId;
    this.outline = mpti.rootProjectChildren;

    if (this.resolveMirrors) {
      WorkflowyClient.transcludeMirrors(this.outline);
    }
    this.nodes = WorkflowyClient.pseudoFlattenUsingSet(this.outline);

    return this.nodes;
  }
  async _update(operations) {
    const meta = await this.meta();

    const clientId = meta.projectTreeData.clientId;
    const timestamp = utils.getTimestamp(meta);

    operations.forEach((operation) => {
      operation.client_timestamp = timestamp;
    });

    const pushPollData = JSON.stringify([
      {
        most_recent_operation_transaction_id: this._lastTransactionId,
        operations,
      },
    ]);

    const form = new FormData();
    form.set('client_id', clientId);
    form.set('client_version', CLIENT_VERSION);
    form.set('push_poll_id', utils.makePollId());
    form.set('push_poll_data', pushPollData);

    const encoder = new FormDataEncoder(form);

    try {
      const response = await fetch(URLS.update, {
        method: 'POST',
        body: Readable.from(encoder),
        headers: {
          ...encoder.headers,
          Cookie: `sessionid=${this.sessionid}`,
        },
      });
      const body = await response.json();

      this._lastTransactionId =
        body.results[0].new_most_recent_operation_transaction_id;
      return { response, body, timestamp };
    } catch (err) {
      console.log('i', err);
    }

    //     .then(utils.httpAbove299toError)
    //     .then((arg) => {
    //       const [resp, body] = arg;
    //       this._lastTransactionId =
    //         body.results[0].new_most_recent_operation_transaction_id;
    //       return [resp, body, timestamp];
    //     });
  }
  /*
   * @search [optional]
   * @returns an array of nodes that match the given string, regex or function
   */
  find(search, completed, parentCompleted) {
    let condition, originalCondition, originalCondition2;
    if (typeof search == 'function') {
      condition = search;
    } else if (typeof search == 'string') {
      condition = (node) => node.nm === search;
    } else if (search instanceof RegExp) {
      condition = (node) => search.test(node.nm);
    } else if (search) {
      throw new Error('unknown search type');
    }
    if (typeof completed == 'boolean') {
      originalCondition = condition;
      condition = (node) =>
        Boolean(node.cp) === !!completed && originalCondition(node);
    }
    if (typeof parentCompleted == 'boolean') {
      originalCondition2 = condition;
      condition = (node) =>
        Boolean(node.pcp) === !!parentCompleted && originalCondition2(node);
    }
    return this.nodes.then((nodes) => {
      if (condition) {
        nodes = nodes.filter(condition);
      }
      return nodes;
    });
  }
  async delete(nodes) {
    nodes = ensureArray(nodes);

    const operations = nodes.map((node) => ({
      type: 'delete',
      data: {
        projectid: node.id,
      },
      undo_data: {
        previous_last_modified: node.lm,
        parentid: node.parentId,
        priority: 5,
      },
    }));

    await this._update(operations);
    await this.refresh();
    return Promise.resolve();
  }
  async complete(nodes, tf) {
    if (tf == null) {
      tf = true;
    }

    nodes = ensureArray(nodes);

    const operations = nodes.map((node) => ({
      type: tf ? 'complete' : 'uncomplete',
      data: {
        projectid: node.id,
      },
      undo_data: {
        previous_last_modified: node.lm,
        previous_completed: tf ? false : node.cp,
      },
    }));

    const { timestamp } = await this._update(operations);

    nodes.forEach((node) => {
      if (tf) {
        node.cp = timestamp;
      } else {
        delete node.cp;
      }
    });
  }
  async createTrees(parentid, nodeArray, priority) {
    if (typeof parentid !== 'string') {
      throw new Error("must provide parentid (use 'None' for top-level)");
    }
    for (let node of nodeArray) {
      await this.createTree(parentid, node, priority);
    }
  }
  async createTree(parentid, topNode, priority) {
    if (typeof parentid !== 'string') {
      throw new Error("must provide parentid (use 'None' for top-level)");
    }
    return this.create(parentid, topNode.nm, priority, topNode.no)
      .then((newTopNode) => {
        topNode.id = newTopNode.id;
        if (!topNode.ch || !topNode.ch.length) {
          return;
        }
        return this.createTrees(topNode.id, topNode.ch, 1000000);
      })
      .then(() => topNode);
  }
  async create(parentid = 'None', name, priority = 0, note) {
    let projectid = uuidv4();
    let operations = [
      {
        type: 'create',
        data: {
          projectid,
          parentid: parentid,
          priority, // 0 adds as first child, 1 as second, etc
        },
      },
      {
        type: 'edit',
        data: {
          projectid,
          name,
          description: note,
        },
      },
    ];
    await this._update(operations).then(utils.httpAbove299toError);
    return { id: projectid };
  }
  async update(nodes, newNames) {
    nodes = ensureArray(nodes);

    const operations = nodes.map((node, idx) => {
      return {
        type: 'edit',
        data: {
          projectid: node.id,
          name: newNames[idx],
        },
        undo_data: {
          previous_last_modified: node.lm,
          previous_name: node.nm,
        },
      };
    });

    const { timestamp } = await this._update(operations);

    nodes.forEach((node, idx) => {
      node.nm = newNames[idx];
      node.lm = timestamp;
    });
  }
  /* modifies the tree so that shared projects are added in */
  static transcludeShares(meta) {
    const howManyShares = meta.projectTreeData.auxiliaryProjectTreeInfos.length;
    if (!howManyShares) {
      return;
    }
    const auxProjectsByShareId = {};
    meta.projectTreeData.auxiliaryProjectTreeInfos.map((x) => {
      if (x && x.rootProject && x.rootProject.shared) {
        auxProjectsByShareId[x.rootProject.shared.share_id] = x;
      }
    });
    const topLevelNodes =
      meta.projectTreeData.mainProjectTreeInfo.rootProjectChildren;
    const shareEntryPoints = utils.findAllBreadthFirst(
      topLevelNodes,
      (node) => node.as,
      howManyShares
    );
    shareEntryPoints.map((node) => {
      const auxP = auxProjectsByShareId[node.as];
      if (!auxP) {
        return;
      } // happens with certain templates
      node.nm = auxP.rootProject.nm;
      node.ch = auxP.rootProjectChildren;
    });
  }
  static getNodesByIdMap(outline) {
    const map = {};

    const mapChildren = (arr) => {
      arr.forEach((node) => {
        map[node.id] = node;
        if (node.ch) {
          mapChildren(node.ch);
        }
      });
    };
    mapChildren(outline);

    return map;
  }
  static transcludeMirrors(outline) {
    const nodesByIdMap = WorkflowyClient.getNodesByIdMap(outline);
    const transcludeChildren = (arr) => {
      for (let j = 0, len = arr.length; j < len; j++) {
        const node = arr[j];
        const originalId =
          node.metadata &&
          (node.metadata.originalId ||
            (node.metadata.mirror && node.metadata.mirror.originalId));
        if (originalId) {
          const originalNode = nodesByIdMap[originalId];
          if (originalNode) {
            arr[j] = originalNode;
          } else {
            // shouldn't happen; did when I was doing weird stuff in testing
          }
        } else {
          // only do children when considering in original situation
          arr[j].ch && transcludeChildren(arr[j].ch);
        }
      }
    };
    transcludeChildren(outline);
  }
  static pseudoFlattenUsingSet(outline) {
    const set = new Set();
    const addChildren = (arr, parentId, parentCompleted) => {
      let children;
      arr.forEach((child) => {
        set.add(child);
        child.parentId = parentId;

        const { id, cp, pcp, ch } = child;

        if (typeof pcp == 'undefined') {
          child.pcp = parentCompleted;
        } else {
          child.pcp = pcp & parentCompleted; // for mirrors
        }
        if ((children = ch)) {
          addChildren(children, id, cp || pcp);
        }
      });
    };
    addChildren(outline, 'None', false);
    return [...set];
  }
};
