# snaphots

An art project that documents my travels around the world. [Visit the site!](https://snapshots.tim-phillips.com/)

![Build & Deploy](https://github.com/timphillips/snapshots/workflows/Build%20&%20Deploy/badge.svg)

## Development

- Run `yarn` to bootstrap the project.
- Run `yarn watch` to a watcher that rebuilds the project when JS/CSS/HTML files are modified.

This project is built in [TypeScript](https://www.typescriptlang.org/) with only one dependency on [rxjs](https://rxjs.dev/).

## Deployment

- Run `yarn build`.
- Copy the `dist` folder to the web server.

Webpack is used to transpile the TypeScript code to JavaScript. To keep things simple, CSS and HTML assets are copied directly to the output directory with no processing. See [webpack.config.js](https://github.com/timphillips/snapshots/blob/master/webpack.config.js) for details.

This project also includes a [GitHub action](https://github.com/timphillips/snapshots/blob/master/.github/workflows/buildDeploy.yml) that automatically builds and deploys the project to [snapshots.tim-phillips.com](https://snapshots.tim-phillips.com/) whenever the `master` branch is updated.
