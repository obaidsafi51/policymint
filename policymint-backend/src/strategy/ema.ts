export class EMACalculator {
  private readonly period: number;
  private readonly multiplier: number;
  private readonly seedPrices: number[] = [];
  private emaValue: number | null = null;

  constructor(period: number) {
    if (!Number.isInteger(period) || period <= 0) {
      throw new Error('EMA period must be a positive integer');
    }

    this.period = period;
    this.multiplier = 2 / (period + 1);
  }

  update(price: number): number | null {
    if (!Number.isFinite(price) || price <= 0) {
      return this.emaValue;
    }

    if (this.emaValue === null) {
      this.seedPrices.push(price);

      if (this.seedPrices.length < this.period) {
        return null;
      }

      const seedTotal = this.seedPrices.reduce((sum, value) => sum + value, 0);
      this.emaValue = seedTotal / this.period;
      this.seedPrices.length = 0;
      return this.emaValue;
    }

    this.emaValue = price * this.multiplier + this.emaValue * (1 - this.multiplier);
    return this.emaValue;
  }

  getValue(): number | null {
    return this.emaValue;
  }

  reset(): void {
    this.seedPrices.length = 0;
    this.emaValue = null;
  }
}
