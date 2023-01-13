const Logger = require('./Logger.js')
const fs = require('fs')
const tar = require('tar')

module.exports = class ArchiveManager {
    static checkIfExists(archive) {
        if (!fs.existsSync(archive)) {
            if (!fs.existsSync(`${archive}.tar.safe`)) {
                Logger.error('Archive does not exist')
                process.exit(1)
            }
            archive += '.tar.safe'
        }
    
        if (!archive.endsWith('.tar.safe')) {
            Logger.error("Archive is not encrypted or extension has been removed")
            process.exit(1)
        }
    
        return archive
    }

    static async isValid(archive)
    {
        let result

        if (archive.endsWith('.tar.safe'))
        archive = archive.replace('.safe', '')

        await tar.list({
            strict: true,
            file: archive,
        })
        .then(() => result = true)
        .catch(() => result = false)

        return result
    }
}