const { merge } = require('webpack-merge')
const commonConfiguration = require('./webpack.common.js')
const ip = require('internal-ip')
const portFinderSync = require('portfinder-sync')

const infoColor = (_message) =>
{
    return `\u001b[1m\u001b[34m${_message}\u001b[39m\u001b[22m`
}

module.exports = merge(
    commonConfiguration,
    {
        mode: 'development',
        devServer:
        {
            host: 'local-ip',
            port: portFinderSync.getPort(8080),
            client: {
                overlay:false,
               logging:"error"
            },
            static: {
                directory: './dist',
                watch: true,
              },
            liveReload: true,
            open: true,
            https: false,
        }
    }
)
