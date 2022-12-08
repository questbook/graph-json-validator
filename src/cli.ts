#! /usr/bin/env node
import yargs from 'yargs'
import { generate } from '.'

const validArgs = process.argv.slice(2)

const { file, outDirectory, outFile, schemaPath, ignoreSchema } = yargs(validArgs)
	.option(
		'file', 
		{
			describe: 'file path of the schema to generate validators for. Can be remote url',
			type: 'string'
		}
	)
	.option(
		'outDirectory',
		{
			describe: 'path to output directory',
			type: 'string'
		}
	)
	.option(
		'outFile',
		{
			describe: 'file name for generated TS',
			type: 'string'
		}
	)
	.option(
		'schemaPath',
		{
			describe: 'path in the document which contain the JSON Schemas to generate validators for',
			type: 'string'
		}
	)
	.option(
		'ignoreSchema',
		{
			describe: 'specify schemas to ignore',
			type: 'array',
			items: {
				type: 'string'
			}
		}
	)
	.demandOption('file')
	.help()
	.argv

generate(file, {
	outDirectory,
	outFile,
	schemaPath,
	ignoreSchemas: ignoreSchema?.map(s => s.toString())
})