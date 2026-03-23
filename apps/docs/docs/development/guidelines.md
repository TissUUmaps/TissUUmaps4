---
sidebar_position: 4
---

# Guidelines

## Editing

The repository includes a list of recommended extensions for VSCode

## Linting

The code can be linted using ESLint:

```sh
pnpm run lint
pnpm run lint:fix
```

## Formatting

The code can be formatted using Prettier:

```sh
pnpm run fmt
pnpm run fmt:check
```

## Testing

The code can be tested using Vitest:

```sh
pnpm run test
```

This is an academic project. As such, we encourage rigorous testing, but loosely tested code may also be acceptable.

## Documentation

User and developer documentation is written in markdown, rendered using Docusaurus, and deployed to GitHub Pages (see below).

We are old-school and prefer readable and well-organized code over excessive inline comments.

API documentation for packages can be auto-generated from TypeDoc code comments.

## Version control

This project uses GitHub for distributed version control using Git: https://github.com/TissUUmaps/TissUUmaps4

The repository follows a simplified Git Flow-like branching model, with a `main` branch holding the latest stable version and a single `development` branch, into which feature branches are merged. Branch rules protect both the `main` branch and the `development` branch from direct pushes without pull requests. Commit messages should loosely follow the [conventional commits](https://www.conventionalcommits.org) guidelines; branch names and pull requests should loosely follow [conventional branch](https://conventional-branch.github.io) guidelines. Only signed commits can be merged.

## Pre-commit hooks

Pre-commit hooks for linting and formatting are managed using Husky and lint-staged.

Pre-commit hooks are automatically installed during `pnpm install` using the `prepare` script.

## Continuous integration

Continuous integration is powered by GitHub Actions. Only the `main` and `development` branches are considered.

Linting, formatting, and testing (see above) need to pass without errors before merging a pull request.

A review is automatically requested from Copilot and needs to be resolved for every pull request.

Test coverage is [reported to codecov.io](https://app.codecov.io/gh/TissUUmaps/TissUUmaps4) for every push and for every pull request.

## Continuous deployment

The application and documentation is continuously deployed to GitHub Pages using GitHub Actions.

Current stable version &rarr; `main` branch:

- Application: https://tissuumaps.github.io/TissUUmaps4/live/
- Documentation: https://tissuumaps.github.io/TissUUmaps4/docs/

Current development version &rarr; `development` branch:

- Application: https://tissuumaps.github.io/TissUUmaps4/live-dev/
- Documentation: https://tissuumaps.github.io/TissUUmaps4/docs-dev/

## Continuous delivery

TODO

## Versioning

This project uses [semantic versioning](https://semver.org).
