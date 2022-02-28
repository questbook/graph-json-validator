import { AnyJSONSchema, FetchReferencedSchema } from '../types'
import { getReferencedSchemaName } from './generics'
import { getDefaultForType } from './get-default-for-type'
import { getSchemaType } from './get-schema-type'

/**
 * Given a JSON schema, generate a class to match the type
 * @param schemaName 
 * @param schema 
 * @param getReferencedSchema 
 * @returns string containing the contents of the class
 */
export const getClass = (schemaName: string, schema: AnyJSONSchema, getReferencedSchema: FetchReferencedSchema) => {
	const propertyList: { name: string, type: string, default: string }[] = []

	if(schema.properties) {
		for(const propertyName in schema.properties) {
			let propertySchema = schema.properties[propertyName]
			let propertySchemaName: string
			if(propertySchema.$ref) {
				propertySchemaName = getReferencedSchemaName(propertySchema.$ref)
				propertySchema = getReferencedSchema(propertySchema.$ref)
			} else {
				propertySchemaName = `${schemaName}_${propertyName}`
			}

			let type = getSchemaType(propertySchemaName, propertySchema, getReferencedSchema)
			const isRequiredProperty = !!schema.required?.includes(propertyName)
			if(!isRequiredProperty) {
				type = `${type} | null`
			}

			propertyList.push({ 
				name: propertyName, 
				type, 
				default: isRequiredProperty ? getDefaultForType(type) : 'null'
			})
		}
	}

	// additional properties will be stored as a separate property of the class as a TypedMap
	// it will not include any of the typed properties mentioned in the JSON schema
	if(schema.additionalProperties) {
		let propertySchema = schema.additionalProperties
		let propertySchemaName: string
		if(propertySchema.$ref) {
			propertySchemaName = getReferencedSchemaName(propertySchema.$ref)
			propertySchema = getReferencedSchema(propertySchema.$ref)
		} else {
			propertySchemaName = `${schemaName}AdditionalProperties`
		}

		const type = getSchemaType(propertySchemaName, propertySchema, getReferencedSchema)
		propertyList.push({
			name: 'additionalProperties',
			type: `TypedMap<string, ${type}>`,
			default: 'new TypedMap()'
		})
	}

	const str = `export class ${schemaName} {
${propertyList.map(p => `\t${p.name}: ${p.type} = ${p.default}`).join('\n')}
}`
	return str
}