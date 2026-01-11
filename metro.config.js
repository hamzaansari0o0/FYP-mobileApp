// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Asset extensions mein 'mov' aur 'mp4' add karein
config.resolver.assetExts.push('mov', 'mp4');

module.exports = config;