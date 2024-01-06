# Archived

This package is no longer needed since jest 29, so there is no need in active maintenence.

## Custom Jest resolver with node exports package entry points support

This package aims to bring [node exports package entry points](https://nodejs.org/api/packages.html#packages_package_entry_points) support to [Jest](https://github.com/facebook/jest), i.e.:
```javascript
// some.test.js
import { Foo } from 'my-package/submodule';
import { Bar } from '@my-scope/package/submodule';
// ...
```

This is heavily discussed in the following [issue #9771](https://github.com/facebook/jest/issues/9771).
Several alternatives proposed, such as
[using enhanced-resolve](https://github.com/facebook/jest/issues/9771#issuecomment-841624042),
[writing own resolver based on firebase-jest-testing resolver](https://github.com/facebook/jest/issues/9771#issuecomment-677759334),
[using custom resolver written for esfx](https://github.com/facebook/jest/issues/9771#issuecomment-838867473).

This package is a slightly generalized version of the [firebase-jest-testing self-resolver](https://github.com/akauppi/firebase-jest-testing/blob/0.0.3-beta.4/sample/hack-jest/self-resolver.cjs):
- test import path for referencing submodule (including `@scoped/` packages);
- try to load that package's `package.json`;
- check for `exports` field, try to find 'node', 'require' or 'default' (in case of `type !== 'module'`) condition;
- reuse `defaultResolver` with updated target.

### Usage

Install:
```shell
yarn add jest-node-exports-resolver -D
```

Add custom resolver [jest config option](https://jestjs.io/docs/configuration#resolver-string):
```javascript
// jest.config.js
module.exports = {
    // ...
    resolver: 'jest-node-exports-resolver',
}

```

### Known limitations

Node.js supports two flavours of 'exports':
- conditions list: when all the entries contain keywords ('import', 'require', 'node' etc.);
- entry points list: when all the entries contain submodule paths ('.', './submodule-a', './submodule-b/*' etc.).

Only the latter one is supported. Feel free to send a PR with conditions list support.
