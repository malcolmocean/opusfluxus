# opusfluxus
NodeJS wrapper for WorkFlowy. Created for integration with [Complice](https://complice.co), a productivity app that's less "what are all the parts of this thing I have to do?" and more ***"what am I going to do today?"***

This is super early stage! Currently the main advantages it has over [the original](https://github.com/mikerobe/workflowy) are:

- it supports auth by sessionid cookie, meaning you don't need to store the user's password in plaintext anywhere. highly recommended.
- it supports creating new nodes, which allows you to easily capture items to your workflowy :D

[![bitHound Score](https://www.bithound.io/github/malcolmocean/opusfluxus/badges/score.svg)](https://www.bithound.io/github/malcolmocean/opusfluxus)

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

Currently only has two features. One is to print your list (`wf tree 1` prints just top-level nodes, `wf tree 2` prints those and their children, etc) and the other is to append datapoints to a given node:

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