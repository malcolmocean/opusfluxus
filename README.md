# opusfluxus

NodeJS wrapper for WorkFlowy. Created for integration with [Complice](https://complice.co), a productivity app that's less "what are all the parts of this thing I have to do?" and more ***"what am I going to do today?"***

This was forked from [ruxi/workflowy](https://github.com/ruxi/workflowy) (which apparently doesn't exist anymore!) and improvements are:

- it supports workflowy's new code-based authentication
- it has a primitive command-line interface
- it supports creating new nodes, which allows you to easily capture items to your workflowy :D
- it supports auth by sessionid cookie, meaning you don't need to store the user's password in plaintext anywhere. highly recommended *(EDIT: it seems the original might allow this using some sort of "cookie jar", but I don't know how that's supposed to work.)*
- you can define aliases to reference often used nodes for insertion

Also this project is in JavaScript, so if you prefer that to working in CoffeeScript, you've come to the right place.

(I'm planning to get rid of `Q` and use `bluebird` or native Promises though, plus many other structural improvements.)

## Changelog

- 2019-10-08:
  - Added new `createTree` and `createTrees` functions
  - Added a new `getAuthType(email)` function, that takes an email and returns `"password"`, or `"code"` (it might also return `"google"` but it also seems maybe they removed it).
- Breaking change made from 0.4.x to 0.5.0 - the previous set-up would result in unhandled promise rejections in the constructor if login failed or sessionid was expired. Now refresh is no longer called in the constructor, so you have to call it manually (thus you can handle the promise yourself).
- 2020-04-28:
  - merged Carolin's aliases function
  - rewrote to use `~/.wfconfig.json` instead of `~/.wfrc`
- 2020-04-30:
  - exported the cli for use by other modules (for [this Roam Research JSON import module](https://github.com/malcolmocean/wf2roam))
- 2020-05-06:
  - rewrote some of the index code to use async/await instead of ridiculous `function (_this) {return function (actual) {}})()` constructs (maybe those looked saner in the original coffeescript?)
  - added a `includeSharedProjects` setting, which modifies the workflowy tree so that external shared projects are part of the tree (pass to Workflowy constructor as property of auth object)
- 2021-01-21:
  - **support for mirrors**! unless you pass `resolveMirrors: false` in the constructor, it will automatically make mirrored bullets show up in the right places in the tree

## Install to your node project

```bash
npm install --save opusfluxus
```

## Install as a command-line tool

```bash
sudo npm install --global opusfluxus

wf # run this once to ensure you're authenticated
```

### Usage as a command-line tool

Currently only has two features. One is to print your list (`wf tree 1` prints just top-level nodes, `wf tree 2` prints those and their children, etc) and the other is to append datapoints to a given node.

#### Print tree

Thanks to [sujunmin](https://github.com/sujunmin) this now has a bunch of options:

```bash
tree [n]                     print your workflowy nodes up to depth n (default: 2)
   [--id=<id/alias>]           print sub nodes under the <id> (default: whole tree)
   [--withnote]                print the note of nodes (default: false)
   [--hiddencompleted]         hide the completed lists (default: false)
   [--withid]                  print id of nodes (default: false)
```

#### Capture/append

Use Workflowy for tasks but wish you had a quicker way to capture things to your inbox? Now you can do that! Well, it takes a little set-up, but once you've got it it's awesome.

The command is `capture`, and here's the spec:

```bash
capture                      add something to a particular node
    --parentid=<id/alias>      36-digit uuid of parent (required) or defined alias
    --name=<str>               what to actually put on the node (required)
   [--priority=<int>]          0 as first child, 1 as second (default 0 (top))
                                 (use a number like 10000 for bottom)
   [--note=<str>]              a note for the node (default '')
```

`wf capture --parentid "<36-digit uuid>" --priority=0 --name ""`

How to get the parentid:

- go to Workflowy
- right-click on the circle to the left of the node you want to add children to
- click Inspect
- then you'll see an element called `<div class="project" projectid="00000000-0000-0000-0000-000000000000">`
- that 36-digit id is the parentid you want.

Priority = 0 (which is default) inserts the item at the top. You can use a very big number to force it to submit at the bottom instead.

I have the following in `.bash_aliases`, which allows me to instantly capture any todo to a node appropriately called **inbox**.

```bash
alias win="wf capture --parentid='00000000-0000-0000-0000-000000000000' --name"
```

So then I just open terminal and type `win "1) call Benjamin #thursday"

Oh, and by the way, that task then gets automatically pulled onto thursday's todo list, thanks to [Complice](https://complice.co/and/workflowy).

#### Aliases

Always giving the parentid as an uuid might not be convenient, so you can also add aliases for them.

``` console
alias                      list all currently defined aliases

alias add                  add new alias
    --id=<id>                   36-digit uuid to alias (required)
    --name=<alias>              name to give the alias (required)

alias remove               remove existing alias
    --name=<str>                name to give the alias (required)
```

For an easier configuration, you can put a file `aliases.json` in the folder you will call opusfluxus from 🙂

``` json
{
   "inbox": "00000000-0000-0000-0000-000000000000",
   "todo": "00000000-0000-0000-0000-000000000000",
   "reccomendations": "00000000-0000-0000-0000-000000000000"
}
```
