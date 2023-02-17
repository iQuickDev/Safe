const aes = require('aes256')
const tar = require('tar')
const fs = require('fs')
const Logger = require('./Logger.js')
const ArchiveManager = require('./ArchiveManager.js')
const crypto = require('crypto')
require('colors')
const prompt = require('prompt')
prompt.message = '  INPUT  '.bold.bgMagenta
prompt.delimiter = ''

async function setPassword() {
    prompt.start()
    try {
        settings.password = (await prompt.get({
            name: 'password',
            hidden: true,
            replace: '*',
            message: " Password:".white,
        })).password

        if (!settings.password) {
            Logger.error("Password cannot be blank")
            await setPassword()
        }

    } catch (e) {
        Logger.newLine()
        Logger.error("The program was forcefully closed")
        process.exit(1)
    }

    // the following two lines avoid a line break

    // move console cursor up
    process.stdout.write('\033[1A')
    // delete entire line
    process.stdout.write('\033[1K')

    // check this document for reference: https://www.csie.ntu.edu.tw/~r92094/c++/VT100.html
}

function displayHelp() {
    console.log('Usage: safe <action> <arg1> <arg2>...'.cyan)
    console.log('Options:'.yellow)
    console.log('  -c <name> <file1> <file2> <fileN>: creates an archive'.green)
    console.log('  -a <archive> <file1> <file2> <fileN>: add a file to the archive'.green)
    console.log('  -r <archive> <file1> <file2> <fileN>: remove a file from the archive'.green)
    console.log('  -e <archive> <destination>: extract the archive'.green)
    console.log('  -v <archive>: view the contents of the archive'.green)
    console.log('  -p <password>: provide the archive password'.green)
    console.log('  -h: view this help message\n'.green)
    console.log(`${'safe'.green.bold} by ${'iQuickDev'.cyan}`)
    console.log('https://github.com/iQuickDev'.blue)
}

const functions = {
    c: function create(name, files) {

        let ignoredFiles = []

        for (const file of [...files]) {
            if (!fs.existsSync(file)) {
                files.splice(files.indexOf(file), 1)
                ignoredFiles.push(file)
            }
        }

        if (files.length == 0) {
            Logger.error('Archive could not be created because no files were selected')
            process.exit(1)
        }

        if (ignoredFiles.length == 1)
        Logger.warn(`File ${ignoredFiles.join(' ')} will be ignored because it does not exist`)
        else if (ignoredFiles.length > 1)
        Logger.warn(`Files ${ignoredFiles.join(' ')} will be ignored because they do not exist`)

        tar.create({
            gzip: false,
            file: `${name}.tar`
        }, files)
            .then(async () => {
                if (!settings.password)
                    await setPassword()

                fs.writeFileSync(`${name}.tar.safe`, aes.encrypt(settings.password, fs.readFileSync(`${name}.tar`)))
                fs.unlinkSync(`${name}.tar`)
                Logger.success(`The archive ${name.bold} was successfully created`)
            })
    },

    a: async function add(archive, files) {
        archive = ArchiveManager.checkIfExists(archive)
        let ignoredFiles = []

        if (!settings.password)
            await setPassword()

        let decryptedArchive = aes.decrypt(settings.password, fs.readFileSync(archive))
        fs.writeFileSync(`${archive.replaceAll('.safe', '')}`, decryptedArchive)

        for (const file of [...files]) {
            if (!fs.existsSync(file)) {
                files.splice(files.indexOf(file), 1)
                ignoredFiles.push(file)
            }
        }

        if (files.length == 0) {
            Logger.error('No file could be added because none was specified')
            process.exit(1)
        }

        if (ignoredFiles.length == 1)
        Logger.warn(`File ${ignoredFiles.join(' ')} will be ignored because it does not exist`)
        else if (ignoredFiles.length > 1)
        Logger.warn(`Files ${ignoredFiles.join(' ')} will be ignored because they do not exist`)

        if (!(await ArchiveManager.isValid(archive)))
        {
            Logger.error(`The password you've provided is invalid`)
            fs.unlinkSync(archive.replaceAll('.safe', ''))
            process.exit(1)
        }

        tar.update({
            gzip: false,
            file: `${archive.replaceAll('.safe', '')}`
        }, files)
            .then(() => {
                Logger.success(`Added ${files.toString()} to the archive ${archive.replaceAll('.tar.safe', '').bold}`)
                fs.writeFileSync(`${archive}`, aes.encrypt(settings.password, fs.readFileSync(archive.replaceAll('.safe', ''))))
                fs.unlinkSync(archive.replaceAll('.safe', ''))
            })
    },
    e: async function extract(archive, destination) {
        destination = destination[0]
        archive = ArchiveManager.checkIfExists(archive)

        if (!destination) {
            Logger.warn('No destination was specified, defaulting to the current directory')
            destination = process.cwd()
        }

        if (!fs.existsSync(destination)) {
            Logger.error('The provided destination does not exist')
            process.exit(1)
        }

        if (!settings.password)
            await setPassword()

        let decryptedArchive = aes.decrypt(settings.password, fs.readFileSync(archive))
        fs.writeFileSync(`${archive.replace('.safe', '')}`, decryptedArchive)

        if (!(await ArchiveManager.isValid(archive)))
        {
            Logger.error(`The password you've provided is invalid`)
            fs.unlinkSync(archive.replaceAll('.safe', ''))
            process.exit(1)
        }

        tar.extract({
            file: archive.replace('.safe', ''),
            cwd: destination
        }).then(async () => {
            Logger.success(`Extracted archive ${archive.replace('.tar.safe', '').bold} to ${destination}`)
            fs.unlinkSync(archive.replaceAll('.safe', ''))
        })
    },
    r: async function remove(archive, files) {

        if (files.length == 0)
        {
            Logger.error('No files to be removed were specified')
            return
        }

        archive = ArchiveManager.checkIfExists(archive)
        let removedFiles = []

        if (!settings.password)
            await setPassword()

        let decryptedArchive = aes.decrypt(settings.password, fs.readFileSync(archive))
        fs.writeFileSync(`${archive.replaceAll('.safe', '.old')}`, decryptedArchive)

        if (!(await ArchiveManager.isValid(archive.replaceAll('.safe', '.old'))))
        {
            Logger.error(`The password you've provided is invalid`)
            fs.unlinkSync(archive.replaceAll('.safe', '.old'))
            process.exit(1)
        }

        let tempFolder = crypto.randomUUID()
        fs.mkdirSync(tempFolder)

        await tar.extract({
            file: archive.replaceAll('.safe', '.old'),
            filter: (path) => {
                let match = files.find(f => f == path)
                if (match)
                {
                    files.splice(files.indexOf(match), 1)
                    removedFiles.push(match)
                    return false
                }

                return true
            },
            cwd: `${tempFolder}`
        })

        fs.unlinkSync(archive)

        await tar.create({
            gzip: false,
            file: archive.replaceAll('.safe', '')
        }, fs.readdirSync(tempFolder))

        let newArchive = archive.replaceAll('.tar.safe', '')
        fs.writeFileSync(`${newArchive}.tar.safe`, aes.encrypt(settings.password, fs.readFileSync(`${newArchive}.tar`)))
        fs.unlinkSync(`${newArchive}.tar`)

        fs.rmSync(archive.replaceAll('.safe', '.old'), {recursive: true, force: true})
        fs.rmSync(tempFolder, {recursive: true, force: true})

        if (files.length == 1)
        Logger.warn(`The file ${files.join()} could not be removed because it does not exist`)
        else if (files.length > 1)
        Logger.warn(`The files ${files.join(' ')} could not be removed because they do not exist`)

        if (removedFiles.length > 0)
        Logger.success(`Successfully removed ${removedFiles.join(' ')} from archive ${newArchive.bold}`)
    },
    v: async function view(archive) {
        let files = []
        archive = ArchiveManager.checkIfExists(archive)

        if (!settings.password)
            await setPassword()

        let decryptedArchive = aes.decrypt(settings.password, fs.readFileSync(archive))

        fs.writeFileSync(archive.replace('.safe', ''), decryptedArchive)

        if (!(await ArchiveManager.isValid(archive)))
        {
            Logger.error(`The password you've provided is invalid`)
            fs.unlinkSync(archive.replaceAll('.safe', ''))
            process.exit(1)
        }

        await tar.list({
            strict: true,
            file: archive.replace('.safe', ''),
            onentry: entry => files.push(entry.path)
        })

        Logger.success(`Listing all archive contents for ${archive.replace('.tar.safe', '')}`)
        for (const file of files) {
            Logger.view(file)
        }

        fs.unlinkSync(archive.replace('.safe', ''))
    }  
}

const possibleFlags = [
    { name: 'a', length: Infinity },
    { name: 'e', length: 2 },
    { name: 'r', length: Infinity },
    { name: 'c', length: Infinity },
    { name: 'v', length: 1 },
    { name: 'p', length: 1 }
]

let args = []

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('-')) {
        const flag = process.argv[i].replace('-', '')
        if (flag == 'h') {
            displayHelp()
            process.exit(0)
        }
        if (possibleFlags.find(f => f.name == flag)) {
            let params = []
            for (let j = 1; j <= possibleFlags.find(f => f.name == flag).length; j++) {
                const nextArg = process.argv[i + j]
                if (nextArg && !nextArg.startsWith('-'))
                    params.push(nextArg)
                else
                    break
            }
            args.push({
                flag,
                params
            })
        }
    }
}

if (args.length == 0) {
    displayHelp()
    process.exit(1)
}

if (args.length > 2) {
    Logger.error("Too many arguments... type safe -h to display a help message")
    process.exit(1)
}

const settings = {
    verbose: false
}

if (args.find(a => a.flag != 'p')) {
    Object.assign(settings, {
        action: args.find(a => a.flag != 'p').flag
    })
} else {
    Logger.error('No action specified, only the password was provided')
    process.exit(1)
}

if (args.find(a => a.flag == 'p')) {
    Object.assign(settings, {
        password: args.find(a => a.flag == 'p').params[0]
    })
}

let createdParams = args.find(arg => arg.flag == settings.action).params

functions[settings.action](createdParams.shift(), createdParams)