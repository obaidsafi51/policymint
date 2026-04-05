type Task<T> = () => Promise<T>;

class SerialQueue {
  private chain: Promise<unknown> = Promise.resolve();

  add<T>(task: Task<T>): Promise<T> {
    const result = this.chain.then(() => task()) as Promise<T>;
    this.chain = result.catch(() => undefined);
    return result;
  }
}

export const txQueue = new SerialQueue();