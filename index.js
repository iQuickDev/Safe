const aes = require('aes256')
const tar = require('tar')
const path = require('path')
const fs = require('fs')
const colors = require('colors')
const prompt = require('prompt')
prompt.message = '[INPUT] '.green
prompt.delimiter = ''

/* FLAGS
*   -a <archive> <file1> <file2> <fileN>: adds a file to the archive
*   -e <archive>, <destination>: extracts the archive
*   -r <archive> <file1>: removes a file from the archive
*   -c <name> <file1> <file2> <fileN>: creates an archive
*   -v <archive>: view the contents of the archive
*   -p <password>: provide the archive password
*/

async function setPassword() {
    prompt.start()
    try {
        settings.password = (await prompt.get({
            name: 'password',
            required: true,
            hidden: true,
            message: "Password:"
        })).password
    } catch (e) {
        console.error("\n[ERROR] The program was forcefully closed".red)
        process.exit(1)
    }
}

function displayHelp() {
    console.log('Usage: safe [OPTION]... [FILE]...\n'.cyan)
    console.log('Options:'.yellow)
    console.log('  -a <archive> <file1> <file2> <fileN>: adds a file to the archive'.green);
    console.log('  -e <archive> <destination>: extracts the archive'.green);
    console.log('  -r <archive> <file1>: removes a file from the archive'.green);
    console.log('  -c <name> <file1> <file2> <fileN>: creates an archive'.green);
    console.log('  -v <archive>: view the contents of the archive'.green);
    console.log('  -p <password>: provide the archive password\n'.green);
}

function checkArchive(archive)
{
    if (!fs.existsSync(archive)) {
        if (!fs.existsSync(`${archive}.tar.safe`)) {
            console.error('[ERROR] Archive does not exist'.red)
            process.exit(1)
        }
        archive += '.tar.safe'
    }

    if (!archive.endsWith('.tar.safe')) {
        console.error("[ERROR] Archive is not encrypted or extension has been removed".red)
        process.exit(1)
    }

    return
}

const functions = {
    c: function create(name, files) {
        tar.create(
            {
                gzip: false,
                file: `${name}.tar`
            },
            files
        )
            .then(async () => {
                if (!settings.password)
                    await setPassword()

                fs.writeFileSync(`${name}.tar.safe`, aes.encrypt(settings.password, fs.readFileSync(`${name}.tar`)))
                fs.unlinkSync(`${name}.tar`)
                console.log(`[SUCCESS] The archive ${name.bold} was successfully created`.green)
            })
    },

    a: async function add(archive, files) {

        checkArchive(archive)

        if (!settings.password)
            await setPassword()

        let decryptedArchive = aes.decrypt(settings.password, fs.readFileSync(archive))
        fs.writeFileSync(`${archive.replaceAll('.safe', '')}`, decryptedArchive)
        
        for (const file of [...files])
        {   
            if (!fs.existsSync(file))
            {
                files.splice(files.indexOf(file), 1)
                console.error(`[WARNING] File ${file} will be ignored because it does not exist`.yellow)
            }
        }

        await tar.update({
            gzip: false,
            file: `${archive.replaceAll('.safe', '')}`
        }, files)
        .then(async () => {
            console.log(`[SUCCESS] Added ${files.toString()} to the archive ${archive.bold}`.green)
            fs.writeFileSync(`${archive}`, aes.encrypt(settings.password, fs.readFileSync(archive.replaceAll('.safe', ''))))
            fs.unlinkSync(archive.replaceAll('.safe', ''))
        })
    },

    e: function extract(archive) {
        checkArchive(archive)
    },

    r: function remove() {
        console.log('called the remove function')
    },

    v: function view() {
        console.log('called the view function')
    },
}

const possibleFlags = [
    { name: 'a', length: Infinity },
    { name: 'e', length: 1 },
    { name: 'r', length: Infinity },
    { name: 'c', length: Infinity },
    { name: 'v', length: 1 },
    { name: 'p', length: 1 },
    { name: 'verbose', length: 0 }
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
    console.log("expected arguments... type safe -h to display a help message")
    process.exit(1)
}

if (args.length > 2) {
    console.log("too many arguments... type safe -h to display a help message")
    process.exit(1)
}

const settings = {
    action: args.find(a => a.flag != 'p').flag,
    verbose: false
}

if (args.find(a => a.flag == 'p')) {
    Object.assign(settings, {
        password: args.find(a => a.flag == 'p').params[0]
    })
}

if (args.find(a => a.flag == 'verbose')) {
    Object.assign(settings, {
        verbose: true
    })
}

let createdParams = args.find(arg => arg.flag == settings.action).params
functions[settings.action](createdParams.shift(), createdParams)

//todo: configure prompt
//todo: better error messages