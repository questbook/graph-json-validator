import axios from 'axios'
import { readFile } from 'fs/promises'

/** Fetches the file at the path, if it's an HTTP url -- fetches using axios */
export const fetchFile = async(path: string) => {
	let data: string
	if(path.startsWith('http:') || path.startsWith('https:')) {
		const result = await axios.get(path, { responseType: 'text' })
		data = result.data
	} else {
		data = await readFile(path, { encoding: 'utf-8' })
	}

	return data
}