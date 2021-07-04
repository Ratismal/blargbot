import { mappingResultNever } from './constants';
import { TypeMappingResult } from './types';

export function mapOptionalString(value: unknown): TypeMappingResult<string | undefined> {
    return typeof value === 'string' || value === undefined
        ? { valid: true, value }
        : mappingResultNever;
}