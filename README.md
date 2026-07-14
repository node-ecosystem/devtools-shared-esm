# Devtools Shared Monorepo

Fork of [devtools-shared](https://github.com/mongodb-js/devtools-shared) to support ESM.

| Package ESM | Orginal Package | Synched with official version
| - | - | -
| [shell-bson-parser-esm](./packages/shell-bson-parser) | [@mongodb-js/shell-bson-parser](https://github.com/mongodb-js/devtools-shared/commits/main/packages/shell-bson-parser) | 1.5.13 (Jun 17, 2026)
| [mongodb-query-parser-esm](./packages/query-parser) | [mongodb-query-parser](https://github.com/mongodb-js/devtools-shared/tree/main/packages/query-parser) | 4.7.14 (Jun 30, 2026)

This repository contains packages that are shared dependencies of Compass, the MongoDB extension for VSCode and MongoSH.

To start working:

```
npm run bootstrap
```

Lint code and dependencies

```
npm run check
```

Run tests

```
npm run test
```

To create a new workspace:

```
npm run create-workspace
```

## Contributing

For contributing, please refer to [CONTRIBUTING.md](CONTRIBUTING.md)
