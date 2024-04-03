function assertHexadecimal(debugPath: string, str: string): void {
  if (!/^0x(0|[0-9a-fA-F]+)$/.test(str)) {
    throw new Error(`${debugPath} must be a hexadecimal!`)
  }
}
