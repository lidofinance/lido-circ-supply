import { TokenData } from './interfaces';

export class StorageService {
  protected tokensData = new Map<string, TokenData>();

  public get(tokenName: string): TokenData {
    return this.tokensData.get(tokenName);
  }

  public set(tokenName: string, tokenData: TokenData): void {
    this.tokensData.set(tokenName, tokenData);
  }
}
