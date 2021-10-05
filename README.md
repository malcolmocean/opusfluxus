<p align="center">
<img src="./app/logo.png" height="200" width="400">
</p>
An unofficial way to send to WorkFlowy from anywhere.

## Intro

This repository allows you to send to your WorkFlowy account from a variety of different sources:

- 🕸 Website
- 🔖 Bookmarklet
- 📱 iOS Shortcut
- 📱 Android (coming soon!)
- ⌨️ Command Line

It helps you save links and text for later so you can concentrate on the task in hand.

## ⚠️ Disclaimer ⚠️

WorkFlowy doesn't have an official API so `send-to-workflowy` needs some configuration to talk to WorkFlowy. It doesn't store any of your login information or WorkFlowy data but it's up to you to keep your Session ID secure.

## How to use

For most users `send-to-workflowy` is a web application hosted at https://send-to-workflowy.netlify.app/

Simply add your Session ID and Parent ID on the Settings panel to send to your WorkFlowy. These IDs are stored in your browser cache for convenience. They are used to communicate with your WorkFlowy but otherwise are not tracked by `send-to-workflowy`. See [Configuration](#configuration) for details on finding these IDs.

<a name="configuration"></a>

## Configuration

### Session ID

`send-to-workflowy` uses a session ID to talk to your WorkFlowy account. The easiest way to do this is to copy it from the browser with the following steps:

- Open WorkFlowy in a browser
- Open the Developer Tools (right click anywhere and click "Inspect")
- Go to the Application tab (on Chrome) or the Storage tab (on FireFox)
- Chrome: In the left hand side bar under "Storage", open up "Cookies"
- In Chrome and FireFox select https://workflowy.com – `sessionid` should be listed
  - e.g. ulz0qzfzv1l1izs0oa2wuol69jdwtvdj

Note that you should treat this session ID as if it were a password. It should not be shared with anyone or posted publicly. Each Session ID expires after a few months.

### Parent ID

All nodes in WorkFlowy have a parent ID. You can provide this to `send-to-workflowy` to always place new nodes under a node with a particular parent ID.

To find your parent ID:

- Open WorkFlowy in a browser
- Find the node you wish to send to
- Open the developer tools. (With Chrome: Ctrl + Shift + J on Windows, Command + Opt + J on macOS)
- Run `copy(WF.currentItem().data.id)`
- Your parent ID will now be on your clipboard ready to be pasted into `send-to-workflowy`
  - It will look something like `d4d9fe09-f770-41ef-d826-cb8fa483424f`

## Integrations

The Settings panel also provides a link to the iOS shortcut and bookmarklet to make it even easier to send to WorkFlowy from your phone or without going to the site. Once you've configured your Session ID and Parent ID the integration icons on the Settings page are ready to use.

### iOS Shortcut

If you select the Apple link you'll be redirected to an iOS shortcut hosted in iCloud. Due to limitations this is the easiest way to create your new `send-to-workflowy` shortcut.

Scroll all the way down to accept the shortcut. On the next page you'll be prompted to add your Session ID and Parent ID. The shortcut expects these in the following form

```
<sessionId>
<parentId>
```

The `send-to-workflowy` web app should have already put these on the clipboard for you so just paste them into the prompt. Note these will not be leaving your device, just used to configure the shortcut.

### Bookmarklet

This bookmarklet can be dragged to your bookmark bar. Again it's configured using the Session and Parent IDs provided in the webapp (locally) – it will send the current URL to your WorkFlowy.

### Android

This integration isn't ready yet. Please let me know if there's a preferred way to do this on Android.

In the meantime it's possible to add bookmarklets to [Chrome on Android](https://paul.kinlan.me/use-bookmarklets-on-chrome-on-android/).

## Self-hosted

The most secure way to use `send-to-workflowy` is to host it yourself. This repository can be deployed to Netlify with the following URL.

The environment variables `SESSIONID` and `PARENTID` can be configured in the Netlify configuration to avoid the need to provide these to the web application in the browser.

[![](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/cjlm/send-to-workflowy)

## Future Roadmap

- [ ] Android integration
- [ ] Date support
- [ ] Multiple parent support
- [ ] Bookmarklet: send page selection if highlighted
- [ ] Bookmarklet: visual confirmation of success
- [ ] email-to-workflowy?
- [ ] text-to-workflowy?

### Dev Improvements

- [ ] Add tests
- [ ] Move top-level code to workspaces

## Acknowledgements

There's a decade of previous attempts at an unofficial API of sorts for WorkFlowy. I am most indebted to Malcolm Ocean's [opusfluxus](https://github.com/malcolmocean/opusfluxus) for the original code forked to make this repository. Thanks to him and his collaborators.

Thanks to Jesse Patel & team for WorkFlowy ❤️
