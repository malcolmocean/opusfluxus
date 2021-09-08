# ↪ send-to-workflowy

An unofficial way to send to Workflowy from anywhere.

## Intro

This repository allows you to send to your Workflowy account from a variety of different sources:

- 🕸 Website
- 🔖 Bookmarklet
- 📱 iOS / Android (coming soon!)
- ⌨️ Command Line

It helps you save links and text for later so you can concentrate on the task in hand.

## ⚠️ Disclaimer ⚠️

Workflowy doesn't have an official API so send-to-workflowy needs some configuration to talk to Workflowy. It doesn't store any of your login information or Workflowy data but it's up to you to keep your Session ID secure. 

## How to use

### Hosted version

An instance of send-to-workflowy is hosted at https://send-to-workflowy.netlify.app/ and is free to use. Simply add your Session ID and Parent ID on the Configuration pane to send to your workflowy.

These IDs are stored in your browser cache for convenience. They are used to communicate with your Workflowy but otherwise are not tracked by send-to-workflowy.

### Self-hosted

The most secure way to use send-to-workflowy is to host it yourself. This repository can be deployed to Netlify with the following URL.

The environment variables `SESSIONID` and `PARENTID` can be configured in the Netlify configuration to avoid the need to provide these to the web application in the browser.

[![](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/cjlm/send-to-workflowy)

## Configuration

### Session ID

Send-to-workflowy uses a session ID to talk to your Workflowy account. The easiest way to do this is to copy it from 

- Open Workflowy in a browser
- Open the Developer Tools
- Go to the network tab
- Refresh the page
- Once the page has loaded, filter the network results by "push_and_poll"
- On the right hand side Click Cookies – your session ID should be at the bottom.

Note that you should treat this session ID as if it were a password. It should not be shared with anyone or posted publically. Each Session ID expires after a few months.

### Parent ID

All nodes in Workflowy have a parent ID. You can provide this to send-to-workflowy to always place new nodes under a node with a particular parent ID.

To find your parent ID:

- Open Workflowy in a browser
- Navigate to the node you wish to send to
- Right click the node and select "Inspect"
- The parent ID is referenced as "projectid" a few rows above the line highlighted in the code.
  - e.g. d4d9fe09-f770-41ef-d826-cb8fa483424f

## Future Roadmap

- [ ] Android Integration
- [ ] Date support
- [ ] Multiple parent support
- [ ] email-to-workflowy?
- [ ] text-to-workflowy?

### Dev Improvements

- [ ] Add tests
- [ ] 

## Acknowledgements

There's a decade of previous attempts at an unofficial API of sorts for Workflowy. I am most indebted to Malcolm Ocean's [opusfluxus](https://github.com/malcolmocean/opusfluxus) for the original code forked to make this repository. Thanks to him and his collaborators.

Thanks to Jesse Patel & team for Workflowy ❤️