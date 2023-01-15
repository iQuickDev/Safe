## safe - A Command Line Utility for Managing Tar Archives

safe is a Node.js command line utility that allows the user to create, extract, and manage tar archives. The utility makes use of various external modules such as aes256 for encryption, tar for creating and extracting tar archives, and fs for interacting with the file system. Additionally, the utility also includes custom modules such as Logger and ArchiveManager which are used to handle logging and archive management respectively.

### Showcase
![showcase](./media/showcase.gif)

### Features
- Create tar archives with option to encrypt them with a password
- Add files to existing tar archives
- Remove files from existing tar archives
- Extract tar archives
- View the contents of tar archives
- Provide a password for encrypted tar archives

### Usage
    safe <action> <arg1> <arg2>...

### Actions
    -c <name> <file1> <file2> <fileN>: creates an archive
    -a <archive> <file1> <file2> <fileN>: add a file to the archive
    -r <archive> <file1> <file2> <fileN>: remove a file from the archive
    -e <archive> <destination>: extract the archive
    -v <archive>: view the contents of the archive
    -p <password>: provide the archive password
    -h: view the help message

### Examples

Create an archive named "example" containing the files "file1.txt" and "file2.txt":

    safe -c example file1.txt file2.txt

Add the file "file3.txt" to the archive "example.tar.safe":

    safe -a example.tar.safe file3.txt

Extract the archive "example.tar.safe" to the destination "./example":

    safe -e example.tar.safe ./example


### Installation

#### Clone this repository

    git clone https://github.com/iQuickDev/safe.git

#### Install dependencies

    npm install

#### Run the script

    node index.js