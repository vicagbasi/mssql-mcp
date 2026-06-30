/**
 * Connection string parsing helpers.
 */

export interface ParsedServerAddress {
  server: string;
  port?: number;
}

export function parseServerAddress(value: string): ParsedServerAddress {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error('SQL Server host cannot be empty');
  }

  const commaIndex = trimmedValue.indexOf(',');
  if (commaIndex === -1) {
    return { server: trimmedValue };
  }

  if (trimmedValue.indexOf(',', commaIndex + 1) !== -1) {
    throw new Error('SQL Server host must use at most one comma to specify a port');
  }

  const server = trimmedValue.slice(0, commaIndex).trim();
  const portText = trimmedValue.slice(commaIndex + 1).trim();

  if (!server) {
    throw new Error('SQL Server host cannot be empty');
  }

  if (!/^\d+$/.test(portText)) {
    throw new Error('SQL Server port must be an integer');
  }

  const port = Number(portText);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('SQL Server port must be between 1 and 65535');
  }

  return { server, port };
}
