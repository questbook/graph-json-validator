import { AnyJSONSchema, FetchReferencedSchema } from '../types'
import { getReferencedSchemaName } from './generics'

/**
 * Given a JSON schema & name, returns the AssemblyScript type it should be
 * @param schemaName Name of the schema
 * @param schema The schema object
 * @param getReferenceSchema 
 * @returns 
 */
export const getSchemaType = (schemaName: string, schema: AnyJSONSchema, getReferenceSchema: FetchReferencedSchema) => {
	let schemaType: string
	switch (schema.type) {
	case 'object':
		schemaType = schemaName
		break
	case 'boolean':
		schemaType = 'boolean'
		break
	case 'string':
		schemaType = 'string'
		if(schema.format) {
			switch (schema.format) {
			case 'integer':
				schemaType = 'BigInt'
				break
			case 'number':
				schemaType = 'BigDecimal'
				break
			case 'hex':
				schemaType = 'Bytes'
				break
			default:
				break
			}
		}

		break
	case 'number':
	case 'integer':
		const isInt = schema.type === 'integer'
		schemaType = isInt ? 'BigInt' : 'BigDecimal'
		break
	case 'array':
		let itemSchemaName: string
		const itemSchema = schema.items
		if(itemSchema.$ref) {
			const schema = getReferenceSchema(itemSchema.$ref)
			const schemaNameForItem = getReferencedSchemaName(itemSchema.$ref)

			itemSchemaName = getSchemaType(schemaNameForItem, schema, getReferenceSchema)
		} else {
			const schemaNameForItem = `${schemaName}Item`
			switch (itemSchema.type) {
			case 'object':
			case 'array':
				itemSchemaName = schemaNameForItem
				break
			default:
				itemSchemaName = getSchemaType(schemaNameForItem, itemSchema, getReferenceSchema)
				break
			}
		}

		schemaType = `${itemSchemaName}[]`
		break
	default:
		throw new Error(`Unexpected type '${schema.type}' for schema '${schemaName}'`)
	}

	return schemaType
}
