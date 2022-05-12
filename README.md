# Durable Objects TypeScript Counter template

## Note: You must use [wrangler](https://developers.cloudflare.com/workers/cli-wrangler/install-update) 1.19.3 or newer to use this template.

## Please read the [Durable Object documentation](https://developers.cloudflare.com/workers/learning/using-durable-objects) before using this template.

A template for kick starting a Cloudflare Workers project using:

- Durable Objects
- TypeScript
- Jest for unit testing
- Modules (ES Modules to be specific)
- Rollup
- Wrangler
- eslint
- miniflare

Worker code is in `src/`. The Durable Object `CounterTs` class is in `src/Account.ts`, and the eyeball script is in `index.ts`.

Run `npm run lint` to run eslint against TypeScript and JavaScript files in `./src`.

Run `npm run format` to format TypeScript and JavaScript files in `./src`.

Run `npm run miniflare` to build the project and locally test on [Miniflare](https://miniflare.dev/).

Rollup is configured to output a bundled ES Module to `dist/index.mjs`.

There's an example unit test in `src/index.test.ts`, which will run as part of `wrangler build`. To run tests on their own use `npm test`.
