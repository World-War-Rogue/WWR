# Test bots

Five accounts that play the game through the public API and check the rulings
after every action. Nothing here touches the database.

## Once per server

Set the secret on the Worker (live: no `--env`; test realm: `--env test`):

    npx wrangler secret put TEST_BOT_SECRET --env test

Mint the accounts and store their passwords in `tools/testbots/bots.json`
(gitignored - never commit it or paste it into chat):

    $env:TEST_BOT_SECRET = "the same secret"
    node tools/testbots/mint.mjs https://wwr-test.<account>.workers.dev 5

## Every run

    node tools/testbots/run.mjs https://wwr-test.<account>.workers.dev --ticks 20 --interval 30 --attacks

Against the live server leave `--attacks` off. The server refuses test-bot
attacks there regardless (`TEST_BOTS_MAY_ATTACK` is only "on" in the test env).

Personas, in `bots.json` order: whale, grinder, raider, idle, builder.
Exit code 1 means at least one rule violation; the report is in
`tools/testbots/reports/`.

## What is checked

- every building and asset at level 1 or above; nothing above the Command Center
- packages never above their asset's rank
- stock never negative and never above the Warehouse cap; wallet never negative
- Delta never open below Command Center 10, never holding assets while closed
- a shield never drops unless the account ordered an Attack
- an attack on a shielded base is refused
- a payment split that does not add up is refused
- no 5xx from any route the bots use
