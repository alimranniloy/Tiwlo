# Resolver Modules

`core.js` is only a compatibility export for old imports.

Real backend work lives in `../modules/<domain>/` with `service.js` and `resolvers.js` per domain. `../resolvers.js` merges those modules into the GraphQL resolver map.

Do not add new production logic to `core.js`; add a domain module under `x/src/modules`.
