import { BigNumber } from '@ethersproject/bignumber';

export const getIntegerPart = (number: BigNumber, decimals: number) => {
  const divider = BigNumber.from(10).pow(decimals);
  return number.div(divider);
};

export const getDecimalPart = (number: BigNumber, decimals: number) => {
  const integerPart = getIntegerPart(number, decimals);
  return number.sub(integerPart.mul(BigNumber.from(10).pow(decimals)));
};
