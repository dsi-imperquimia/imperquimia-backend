import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Los alias (@/*, @gen/prisma/*) viven en tsconfig.json,
// se leen de ahí para no duplicarlos.
const { config: tsconfig } = ts.readConfigFile('./tsconfig.json', (path) =>
  ts.sys.readFile(path),
) as { config?: { compilerOptions?: { paths?: Record<string, string[]> } } };
const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    // El cliente Prisma generado importa archivos .ts con extensión .js
    '^(\\.{1,2}/.*)\\.js$': '$1',
    ...pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
