import { mkdir, writeFile } from 'fs/promises'
import { load } from 'js-yaml'
import path from 'path'
import { copyDirectoryContents } from './utils/copy-directory-contents'
import { fetchFile } from './utils/fetch-file'
import { generateValidators } from './utils/generate-validators'
import { Options } from './types'

// folder containing utilities required for validation
const AS_UTILS_FOLDER = '../as-utils'

export const generate = async(schemaFile: string, opts: Options = { }) => {
	const utilsFolder = path.join(__dirname, AS_UTILS_FOLDER)
	const txt = await fetchFile(schemaFile)
	// get the format of the document
	// if not specified, use the file extension to determine
	const format = opts.format || (schemaFile.endsWith('.json') ? 'json' : 'yaml')
	const outDir = opts.outDirectory || './json-schema'
	const outFile = opts.outFile || './index.ts'
	// parse the schema document
	const schemaDoc = format === 'json' ? JSON.parse(txt) : load(txt)
	// generate the validators file
	const generatedFile = await generateValidators(schemaDoc, opts)
	// recursively mk the out directory
	await mkdir(outDir, { recursive: true })
	// copy utils required for schema validation
	await copyDirectoryContents(utilsFolder, outDir)
	// write out our main generator file
	await writeFile(path.join(outDir, outFile), generatedFile)
}