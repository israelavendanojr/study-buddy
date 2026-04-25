const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

config.resolver.extraNodeModules = {
  'react-dom': path.resolve(__dirname, 'stubs/react-dom.js'),
}

module.exports = config
