import DecimalLib from 'decimal.js';

const Decimal = DecimalLib as any;

export type DecimalValue = string | number | any;

export const decimal = (value: DecimalValue) => new Decimal(value);

export const toDecimalString = (value: DecimalValue) => decimal(value).toString();

export const normalizeDecimal = (value: DecimalValue) => {
  const normalized = decimal(value);
  return normalized.isFinite() ? normalized.toDecimalPlaces(6).toString() : '0';
};

export const compareDecimal = (a: DecimalValue, b: DecimalValue) => {
  return decimal(a).comparedTo(decimal(b));
};

export const sumDecimals = (...values: DecimalValue[]) =>
  values.reduce((acc, value) => acc.plus(decimal(value)), new Decimal(0));

export const multiplyPercent = (base: DecimalValue, percent: DecimalValue) => {
  const baseValue = decimal(base);
  return baseValue.mul(decimal(percent)).div(100);
};
