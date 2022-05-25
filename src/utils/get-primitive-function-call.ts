import { AnyJSONSchema, CompileResult } from '../types'

/**
 * Returns the function call required to validate a primitive schema. 
 * Pritivive schema would be one of "string", "integer", "number", "boolean"
 * 
 * @param jsonVariable The variable name of the JSONValue type to be validated against a primitive
 * @param schemaName 
 * @param schema 
 * @returns 
 */
export const getPrimitiveFunctionCall = (jsonVariable: string, schemaName: string, schema: AnyJSONSchema) => {
	// in case of a string enum
	// we can require constant declaration of the enum set
	const constantDeclarations: CompileResult['constantDeclarations'] = []

	const type = schema.type
	let functionCall: string
	switch (type) {
	case 'boolean':
		functionCall = `validateBoolean(${jsonVariable})`
		break
	case 'string':
		let enumValueSetName: string | null = null
		if(schema.enum) {
			enumValueSetName = `${schemaName}EnumSet`
			constantDeclarations.push({
				name: enumValueSetName,
				declaration: `toSet([${schema.enum.map((e: string) => `'${e}'`).join(', ')}])`
			})
		}

		functionCall = `validateString(${jsonVariable}, ${schema.minLength || -1}, ${schema.maxLength || -1}, ${enumValueSetName})`
		// if the string is meant to represent an integer or decimal
		// we use this
		switch (schema.format) {
		case 'integer':
			functionCall = `validateStringResultInteger(${functionCall})`
			break
		case 'number':
			functionCall = `validateStringResultNumber(${functionCall})`
			break
		case 'hex': // if it's a hex -- then we treat it as "Bytes"
			functionCall = `validateBytesFromStringResult(${functionCall})`
			break
		case 'date-time':
			functionCall = `validateDateTimeFromStringResult(${functionCall})`
			break
		default:
			break
		}

		break
	case 'number':
	case 'integer':
		const isInt = type === 'integer'
		functionCall = isInt 
			? `validateInteger(${jsonVariable}, ${schema.minimum ? `BigInt.fromString('${schema.minimum}')` : null}, ${schema.maximum ? `BigInt.fromString('${schema.maximum}')` : null})`
			: `validateNumber(${jsonVariable}, ${schema.minimum ? `BigDecimal.fromString('${schema.minimum}')` : null}, ${schema.maximum ? `BigDecimal.fromString('${schema.maximum}')` : null})`
		break
	default:
		throw new Error(`Expected primitive but got "${type}"`)
	}

	return {
		functionCall,
		constantDeclarations
	}
}