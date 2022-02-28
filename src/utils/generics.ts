
/**
 * Return the value of the object given a notated path.
 * Eg. of path components.schema.xyz
 */
export const getNestedObject = (obj: any, path: string, sep = '.') => {
	if(path.length) {
		const pathList = path.split(sep)
		for(const item of pathList) {
			obj = obj?.[item]
		}
	}

	return obj
}

/**
 * Given a ref, return what name would the schema have
 * Eg. if ref is "#/components/schemas/ABCD", function would return "ABCD"
 * @param ref the ref path
 * @returns 
 */
export const getReferencedSchemaName = (ref: string) => {
	const refPath = ref.split('/')
	const name = refPath[refPath.length-1]
	return name
}