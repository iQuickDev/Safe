require('colors')

module.exports = class Logger {

    static newLine()
    {
        console.log()
    }

    static view(message) {
        console.log('  VIEW   '.bold.bgCyan + ` ${message}`.cyan)
    }

    static success(message) {
        console.log(' SUCCESS '.bold.bgGreen + ` ${message}`.green)
    }

    static info(message) {
        console.log('  INFO   '.bold.bgWhite.black + ` ${message}`.gray)
    }

    static warn(message) {
        console.warn(' WARNING '.bold.black.bgYellow + ` ${message}`.yellow)
    }

    static error(message) {
        console.error('  ERROR  '.bold.bgRed + ` ${message}`.red)
    }
}