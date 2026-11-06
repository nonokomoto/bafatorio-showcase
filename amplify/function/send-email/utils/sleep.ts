/**
 * Utility function to create a delay in async operations
 * @param ms - Time to sleep in milliseconds
 * @returns Promise that resolves after the specified time
 */
export const sleep = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms));