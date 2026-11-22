// roots + testMatch relativo: con <rootDir> dentro de testMatch, Jest arma en
// Windows una ruta con barras mezcladas ("...\.jest-build/src/**") y no
// encuentra ninguna suite. Así funciona igual en Windows y Linux.
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/.jest-build/src'],
  testMatch: ['**/*.entrega.spec.js'],
  transform: {},
};
