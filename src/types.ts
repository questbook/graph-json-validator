
export type Options = Partial<{
	/** path in the document which contain the JSON Schemas to generate validators for */
	schemaPath: string
	/** directory to output files */
	outDirectory: string
	/** file name to use for the generated file */
	outFile: string
	/** whether we're parsing a JSON or YAML doc */
	format: 'json' | 'yaml'
	/** schemas to ignore generating types for */
	ignoreSchemas: string[]
}>

export type CompileResult = {
	functions: string[]
	classes: string[]
	constantDeclarations: { name: string, declaration: string }[]
}

export type AnyJSONSchema = any

export type FetchReferencedSchema = (refPath: string) => AnyJSONSchema