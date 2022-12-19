const aes = require('aes256')
const tar = require('tar')
const path = require('path')
const fs = require('fs')
const prompt = require('prompt')
prompt.message = '[INPUT] '

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
    settings.password = (await prompt.get({ name: 'Password', required: true, hidden: true })).Password
}

const functions = {
    c: function create(name, files) {
        tar.create(
            {
                gzip: true,
                file: `${name}.tar.gz`
            },
            files
        )
            .then(async () => {
                if (!settings.password)
                    await setPassword()

                fs.writeFileSync(`${name}.tar.gz.safe`, aes.encrypt(settings.password, fs.readFileSync(`${name}.tar.gz`)))
            })
    },

    a: function add(archive, file) {
        console.log('called the add function')
    },

    e: function extract(archive) {
        console.log('called the extract function')
    },

    r: function remove() {
        console.log('called the remove function')
    },

    v: function view() {
        console.log('called the view function')
    },

    d: function decrypt(password) {
        console.log('called the decrypt function')
    }
}

const possibleFlags = [
    { name: 'a', length: Infinity },
    { name: 'e', length: 1 },
    { name: 'r', length: Infinity },
    { name: 'c', length: Infinity },
    { name: 'v', length: 1 },
    { name: 'p', length: 1 }
]

let args = []

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('-')) {
        const flag = process.argv[i].replace('-', '')
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

const settings = {
    password: args.find(a => a.flag == 'p').params[0],
    action: args.find(a => a.flag != 'p').flag
}

let createdParams = args.find(arg => arg.flag == settings.action).params
functions[settings.action](createdParams.shift(), createdParams)

//todo: parser recognizes too many args
//todo: configure prompt
//todo: better error messages