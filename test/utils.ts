export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const bigDecimal = (number: number) => {
  return BigInt(number) * 10n ** 18n;
};
