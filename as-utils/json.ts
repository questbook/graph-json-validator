import { BigDecimal, BigInt, Bytes, ipfs, json, JSONValue, JSONValueKind, TypedMap } from '@graphprotocol/graph-ts'

/** Generic result structure to catch successful & errorred results */
export class Result<T> {
	value: T | null = null;
	error: string | null = null;
}

/** Boolean wrapper, to help make nullable booleans */
export class Boolean {
	isTrue: boolean = false
}

export function toSet<T>(arr: T[]): Set<T> {
	const set = new Set<T>()
	for(let i = 0;i < arr.length;i++) {
		set.add(arr[i])
	}

	return set
}

const NUMBER_SET = toSet(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])

function validateStringNumber(decimalString: string, isDecimal: boolean): Result<string> {
	// ensure it is a valid number
	for(let i = 0;i < decimalString.length;i++) {
		const char = decimalString.charAt(i)
		if(!NUMBER_SET.has(char)) {
			if(!isDecimal || char === '.') {
				return { value: null, error: `unexpected character '${char}' in ${isDecimal ? 'floating point' : 'integer'}` }
			}
		}
	}

	return { value: decimalString, error: null }
}

function validateJSONValueNumber(json: JSONValue, isDecimal: boolean): Result<string> {
	const decimalString = changetype<string>(json.data as u32)
	return validateStringNumber(decimalString, isDecimal)
}

export function validateStringResultNumber(r: Result<string>): Result<BigDecimal> {
	if(r.error) {
		return { value: null, error: r.error }
	}

	r = validateStringNumber(r.value!, true)
	if(r.error) {
		return { value: null, error: r.error }
	}

	return { value: BigDecimal.fromString(r.value!), error: null }
}

export function validateStringResultInteger(r: Result<string>): Result<BigInt> {
	if(r.error) {
		return { value: null, error: r.error }
	}

	r = validateStringNumber(r.value!, false)
	if(r.error) {
		return { value: null, error: r.error }
	}

	return { value: BigInt.fromString(r.value!), error: null }
}

export function validateNumber(json: JSONValue, minimum: BigDecimal | null, maximum: BigDecimal | null): Result<BigDecimal> {
	const result = validateJSONValueNumber(json, true)
	if(result.error) {
		return { value: null, error: result.error }
	}

	const value = BigDecimal.fromString(result.value!)
	if(minimum && !value.ge(minimum)) {
		return { value: null, error: `Expected number to be >= ${minimum.toString()}` }
	}

	if(maximum && !value.le(maximum)) {
		return { value: null, error: `Expected number to be <= ${maximum.toString()}` }
	}

	return { value, error: null }
}

export function validateInteger(json: JSONValue, minimum: BigInt | null, maximum: BigInt | null): Result<BigInt> {
	const result = validateJSONValueNumber(json, false)
	if(result.error) {
		return { value: null, error: result.error }
	}

	const value = BigInt.fromString(result.value!)
	if(minimum && !value.ge(minimum)) {
		return { value: null, error: `Expected integer to be >= ${minimum.toString()}` }
	}

	if(maximum && !value.le(maximum)) {
		return { value: null, error: `Expected integer to be <= ${maximum.toString()}` }
	}

	return { value, error: null }
}

export function validateString(json: JSONValue, minimumLength: number, maximumLength: number, enumValues: Set<string> | null): Result<string> {
	if(json.kind !== JSONValueKind.STRING) {
		return { value: null, error: `Expected to be string, found "${json.kind}"` }
	}

	const value = json.toString()
	if(minimumLength >= 0 && value.length < minimumLength) {
		return { value: null, error: `Expected string length to be >= ${minimumLength}` }
	}

	if(maximumLength >= 0 && value.length > maximumLength) {
		return { value: null, error: `Expected string length to be <= ${maximumLength}` }
	}

	if(enumValues && !enumValues.has(value)) {
		return { value: null, error: `Expected string to be one of ${enumValues.values().join(', ')}` }
	}

	return { value, error: null }
}

export function validateBoolean(json: JSONValue): Result<Boolean> {
	if(json.kind !== JSONValueKind.BOOL) {
		return { value: null, error: `Expected to be boolean, found "${json.kind}"` }
	}

	return { value: { isTrue: json.toBool() }, error: null }
}

export function validateArray<T>(json: JSONValue, minimumLength: number, maximumLength: number, mappingFunction: (item: JSONValue) => Result<T>): Result<T[]> {
	if(json.kind !== JSONValueKind.ARRAY) {
		return { value: null, error: `Expected to be array, found "${json.kind}"` }
	}

	const value: T[] = []

	const array = json.toArray()
	if(minimumLength >= 0 && array.length < minimumLength) {
		return { value: null, error: `Expected array length to be >= ${minimumLength}` }
	}

	if(maximumLength >= 0 && array.length > maximumLength) {
		return { value: null, error: `Expected array length to be <= ${maximumLength}` }
	}

	for(let i = 0;i < array.length;i++) {
		const itemResult = mappingFunction(array[i])
		if(itemResult.error) {
			return { value: null, error: `Error in mapping element '${i}' "${itemResult.error!}"` }
		}
		
		value.push(itemResult.value!)
	}

	return { value, error: null }
}

export function validateObject(json: JSONValue): Result<TypedMap<string, JSONValue>> {
	if(json.kind !== JSONValueKind.OBJECT) {
		return { value: null, error: `Expected to be object, found "${json.kind}"` }
	}

	return { value: json.toObject(), error: null }
}

export function validateTypedMap<T>(json: JSONValue, excludeProperties: Set<string> | null, mappingFunction: (item: JSONValue) => Result<T>): Result<TypedMap<string, T>> {
	const objResult = validateObject(json)
	if(objResult.error) {
		return { value: null, error: objResult.error }
	}

	const obj = objResult.value!

	const value: TypedMap<string, T> = new TypedMap()
	for(let i = 0;i < obj.entries.length;i++) {
		const entry = obj.entries[i]
		if(!excludeProperties || !excludeProperties.has(entry.key)) {
			const itemResult = mappingFunction(entry.value)
			if(itemResult.error) {
				return { value: null, error: `Error in mapping element '${entry.key}' "${itemResult.error!}"` }
			}
			
			value.set(entry.key, itemResult.value!)
		}
	}

	return { value, error: null }
}

export function validateBytes(str: string): Result<Bytes> {
	if(str.startsWith('0x')) {
		// remove the 0x
		str = str.slice(2)
	}

	if(str.length % 2 !== 0) {
		return { value: null, error: 'String must be multiple of 2' }
	}

	const item = Bytes.fromHexString(str)
	return { value: Bytes.fromByteArray(item), error: null }
}

export function validateBytesFromStringResult(r: Result<string>): Result<Bytes> {
	if(r.error) {
		return { value: null, error: r.error }
	}

	return validateBytes(r.value!)
}

/// Fetch a JSON file from IPFS & validate it using a given function
export function validatedJsonFromIpfs<T>(hash: string, mapFunction: (json: JSONValue) => Result<T>): Result<T> {
	let data: Bytes | null
	// this mechanism exists to prevent IPFS calls while testing
	// since IPFS is not supported on matchstick as of now
	if(hash.slice(0, 5) == 'json:') {
		data = Bytes.fromUTF8(hash.slice(5))
	} else {
		data = ipfs.cat(hash)
	}

	if(!data) {
		return { value: null, error: 'File not found' }
	}

	const jsonDataResult = json.try_fromBytes(data)
	if(!jsonDataResult.isOk) {
		return { value: null, error: 'Invalid JSON' }
	}

	if(!jsonDataResult.value) {
		return { value: null, error: 'Null JSON' }
	}

	return mapFunction(jsonDataResult.value)
}