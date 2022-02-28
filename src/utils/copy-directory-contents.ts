import { copyFile, lstat, readdir } from 'fs/promises'
import path from 'path'

export const copyDirectoryContents = async(src: string, target: string) => {
	const contents = await readdir(src)
	for(const file of contents) {
		const curSource = path.join(src, file)
		const result = await lstat(curSource)

		if(!result.isDirectory()) {
			await copyFile(curSource, path.join(target, file))
		}
	}
}