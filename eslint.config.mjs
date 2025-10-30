import next from 'eslint-config-next'

export default [
  ...next,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
      '@next/next/no-assign-module-variable': 'off',
    },
    ignores: [
      '.next/**',
      'node_modules/**',
      'oracle-service/dist/**',
      'oracle-service/node_modules/**',
      'contract/target/**',
      'target/**',
      'dist/**',
      'build/**',
      'contract/idl/**',
      'contract/target/**',
      'contract/.anchor/**',
      'prisma/dev.db',
    ],
  },
]


