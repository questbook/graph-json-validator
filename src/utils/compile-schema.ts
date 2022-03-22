import { AnyJSONSchema, CompileResult, FetchReferencedSchema } from '../types'
import { mergeResults, newCompileResult } from './compile-result-utils'
import { getReferencedSchemaName } from './generics'
import { getClass } from './get-class'
import { getPrimitiveFunctionCall } from './get-primitive-function-call'
import { getSchemaType } from './get-schema-type'

export const compileSchema = (schemaName: string, schema: AnyJSONSchema, getReferenceSchema: FetchReferencedSchema): CompileResult => {
	const result = newCompileResult()

	const functionName = `validate${schemaName}`
	const operations: string[] = []
	const compiledSchemaName = getSchemaType(schemaName, schema, getReferenceSchema)

	switch (schema.type) {
	// if the schema is an object
	// we need to generate a full class to store the type & validate it
	case 'object':
		// generate the class & add it to our results
		const classStr = getClass(schemaName, schema, getReferenceSchema)
		result.classes.push(classStr)
		// first operation is to generate an instance of the class
		operations.push(`const value = new ${schemaName}()`)
		// check if the given JSON is a valid object
		operations.push(
			`const objResult = validateObject(json)
if(objResult.error) {
	return { value: null, error: objResult.error }
}
const obj = objResult.value!`
		)
			
		if(schema.additionalProperties) {
			let propsEnumVariable: string | null = null
			if(schema.properties) {
				propsEnumVariable = `${schemaName}PropertiesSet`
				result.constantDeclarations.push({
					name: propsEnumVariable,
					declaration: `toSet([${Object.keys(schema.properties).map(p => `'${p}'`).join(', ')}])`
				})
			}
				
			let propertySchemaName: string
			if(schema.additionalProperties.$ref) {
				propertySchemaName = getReferencedSchemaName(schema.additionalProperties.$ref)
			} else {
				propertySchemaName = `${schemaName}AdditionalProperties`
				const compileResult = compileSchema(propertySchemaName, schema.additionalProperties, getReferenceSchema)
				mergeResults(result, compileResult)
			}

			operations.push(
				`const addPropertiesResult = validateTypedMap(json, ${propsEnumVariable}, validate${propertySchemaName})
if(addPropertiesResult.error) {
	return { value: null, error: ['Error in mapping additionalProperties: ', addPropertiesResult.error].join('') }
}
value.additionalProperties = addPropertiesResult.value!
`
			)
		}

		if(schema.properties) {
			for(const propertyName in schema.properties) {
				const propertyJsonVariable = `${propertyName}Json`
				operations.push(`const ${propertyJsonVariable} = obj.get('${propertyName}')`)
				// if property is required -- ensure we add a guard clause for it
				if(schema.required?.includes(propertyName)) {
					operations.push(
						`if(!${propertyJsonVariable}) return { value: null, error: "Expected '${propertyName}' to be present in ${schemaName}" }`
					)
				}

				const globalSchemaName = `${schemaName}_${propertyName}`

				const propertySchema = schema.properties[propertyName]
				let validationFunctionCall: string

				if(propertySchema.$ref) {
					const itemSchemaName = getReferencedSchemaName(propertySchema.$ref)
					validationFunctionCall = `validate${itemSchemaName}(${propertyJsonVariable})`
				} else {
					switch (propertySchema.type) {
					case 'object':
					case 'array':
						const compileResult = compileSchema(globalSchemaName, propertySchema, getReferenceSchema)
						mergeResults(result, compileResult)

						validationFunctionCall = `validate${globalSchemaName}(${propertyJsonVariable})`
						break
					case 'integer':
					case 'number':
					case 'boolean':
					case 'string':
						const { functionCall, constantDeclarations } = getPrimitiveFunctionCall(propertyJsonVariable, globalSchemaName, propertySchema)
						result.constantDeclarations.push(...constantDeclarations)
						validationFunctionCall = functionCall
						break
					default:
						throw new Error(`Unknown property type "${propertySchema.type}" in ${schemaName} for ${propertyName}`)
					}
				}

				operations.push(
					`if(${propertyJsonVariable}) {
	const ${propertyName}Result = ${validationFunctionCall}
	if(${propertyName}Result.error) {
		return { value: null, error: ["Error in mapping '${propertyName}': ", ${propertyName}Result.error!].join('') }
	}
	if(${propertyName}Result.value) {
		value.${propertyName} = ${propertyName}Result.value!
	}
}`
				)
			}
		}

		operations.push('return { value, error: null }')
		break
	case 'array':
		let itemSchemaName: string
		const itemType = schema.items
		if(itemType.$ref) {
			itemSchemaName = getReferencedSchemaName(itemType.$ref)
		} else {
			itemSchemaName = `${schemaName}Item`
			const compileResult = compileSchema(itemSchemaName, itemType, getReferenceSchema)
			mergeResults(result, compileResult)
		}

		const validationFunctionName = `validate${itemSchemaName}`

		operations.push(`return validateArray(json, ${schema.minItems || -1}, ${schema.maxItems || -1}, ${validationFunctionName})`)
		break
	case 'boolean':
	case 'string':
	case 'integer':
	case 'number':
		const { functionCall, constantDeclarations } = getPrimitiveFunctionCall('json', schemaName, schema)
		operations.push(`return ${functionCall}`)
		result.constantDeclarations.push(...constantDeclarations)
		break
	default:
		throw new Error(`Unexpected type '${schema.type}' for schema`)
	}

	// join all operations and generate the function body
	const functionBody = `export function ${functionName}(json: JSONValue): Result<${compiledSchemaName}> {
${operations.join('\n')}
}`
	result.functions.splice(0, 0, functionBody)

	return result
}