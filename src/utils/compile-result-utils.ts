import { CompileResult } from '../types'

export const newCompileResult = (): CompileResult => ({ functions: [], classes: [], constantDeclarations: [] })

export const mergeResults = (r1: CompileResult, r2: CompileResult) => {
	r1.functions.push(...r2.functions)
	r1.classes.push(...r2.classes)
	r1.constantDeclarations.push(...r2.constantDeclarations)
}