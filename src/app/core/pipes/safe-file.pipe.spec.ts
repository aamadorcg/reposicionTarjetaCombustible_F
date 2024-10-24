import { SafeFilePipe } from './safe-file.pipe';

describe('SafeFilePipe', () => {
  it('create an instance', () => {
    const pipe = new SafeFilePipe();
    expect(pipe).toBeTruthy();
  });
});
