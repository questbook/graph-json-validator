import { FetchReferencedSchema, Options } from '../types'
import { mergeResults, newCompileResult } from './compile-result-utils'
import { compileSchema } from './compile-schema'
import { getNestedObject } from './generics'

/**
 * Given a JSON schema doc -- generate Graph AssemblyScript validators for it
 * @param schemaDoc the JSON schema
 * @param opts options for the JSON schema
 * @returns AssemblyScript file which exports the required validators as functions
 */
export const generateValidators = (schemaDoc: any, opts: Options = {}) => {
	// fetch which object to parse from the whole document
	const schemasToParse = getNestedObject(schemaDoc, opts.schemaPath || '')
	
	if(typeof schemasToParse !== 'object') {
		throw new Error('Expected schemas to parse to be an object')
	}

	/// fetch the schema from the document with the given ref path
	const getReferencedSchema: FetchReferencedSchema = (ref: string) => {
		const DOC_PREFIX = '#/' // strip out document prefix
		ref = ref.startsWith(DOC_PREFIX) ? ref.slice(DOC_PREFIX.length) : ref

		const result = getNestedObject(schemaDoc, ref, '/')
		if(!result) {
			throw new Error(`Invalid reference "${ref}"`)
		}

		return result
	}

	// all the classes, declarations, functions etc. required to build the validator for the document
	const fullResult = newCompileResult()
	// loop through every schema in the doc and generate a validator for it
	for(const schemaName in schemasToParse) {
		const result = compileSchema(schemaName, schemasToParse[schemaName], getReferencedSchema)
		mergeResults(fullResult, result)
	}

	// finally combine all the generated classes, declarations & functions into one file
	// we put in all requied imports at the top
	const generatedFile = `
// Auto generated file using graph-json-validator. Do not modify manually.

import { TypedMap, BigInt, BigDecimal, Bytes, JSONValue } from '@graphprotocol/graph-ts'
import { Result, toSet, validateObject, validateNumber, validateInteger, validateArray, validateBoolean, validateString, validateTypedMap, validateBytesFromStringResult } from './json'

${fullResult.constantDeclarations.map(dec => `const ${dec.name} = ${dec.declaration}`).join('\n')}

${fullResult.classes.join('\n\n')}

${fullResult.functions.join('\n\n')}
`
	return generatedFile
}
