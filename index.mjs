import fs from 'node:fs/promises'
import path from 'node:path'

const f = async () => {
    const f2 = async () => {
        return fs.access(path.resolve(process.cwd(), 't', 'file1.txt'))
            .then(() => {
                console.log('success1')
                throw new Error('33')
            }).catch((e) => {
                throw new Error('33')
            })
    }

    const res = await f2()
        .then((data) => {
            return 'success2'
        })
        .catch(() => {
            return 'error'
        })

    console.log(res, 333)
}

f()