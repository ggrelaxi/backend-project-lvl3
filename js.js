import fsp from 'fs/promises'
import path from 'path'
fsp.access(path.resolve(process.cwd(), '/sys')).then(() => console.log('the')).catch(e => console.log(e))

fsp.mkdir(path.resolve(process.cwd(), '/123'))