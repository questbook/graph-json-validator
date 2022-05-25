
/**
 * Given a AS type -- returns the default value for it
 * Eg. if type = "string", then function would return ''
 * @param type 
 * @returns 
 */
export const getDefaultForType = (type: string) => {
	let result: string
	if(type.endsWith('[]')) { // is an array type
		result = '[]' // default is empty array
	} else if(type === 'string') { // is a string
		result = "''" // default is empty string
	} else if(type === 'BigInt' || type === 'BigDecimal' || type === 'Bytes' || type === 'Date') {
		result = `new ${type}(0)` // empty value
	} else { // some generic class otherwise
		result = `new ${type}()` // instantiate empty instance of the class
	}

	return result
}