import { uuidv7 } from 'uuidv7';

export const generateId = (): string => uuidv7();

export const isValidUUIDv7 = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
