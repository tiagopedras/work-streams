# interface

The browser half. Empty until the model lands; see [../CONTRACT.md](../CONTRACT.md)
for what goes in each file and [../README.md](../README.md) for the rule these
files live under.

The short version of that rule: `item.js`, `lanes.js` and `card.js` are classic
scripts with no `window`, no `document` and no `state` in them, because the board
loads them before its own scripts and the tests run them with no browser at all.
`board.js` may touch the DOM, and takes the element to draw into as an argument.
