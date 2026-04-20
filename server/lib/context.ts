import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
    companyId?: string;
    userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Returns the current request context from AsyncLocalStorage.
 */
export function getRequestContext() {
    return requestContext.getStore();
}

/**
 * Helper to get the current company ID from the context.
 */
export function getCurrentCompanyId() {
    return requestContext.getStore()?.companyId;
}
