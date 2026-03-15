const babelConfig = require('@nextcloud/babel-config')

module.exports = {
  ...babelConfig,
  presets: [
    ...(babelConfig.presets || []),
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
}
