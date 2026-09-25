export const findColourLiterals = (source: string): string[] =>
  source.match(/\[#[0-9a-fA-F]{3,8}\]|['"`]#[0-9a-fA-F]{3,8}['"`]/g) ?? [];
