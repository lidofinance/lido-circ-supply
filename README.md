# Lido Circ Supply

Service returns circulating supply for Lido tokens.

## Endpoints

After the server starts, Swagger will be available at `/api`.

### LDO

Circ supply is calculated by the formula:

```
Circ supply = Total LDO supply - LDO tokens in Lido treasury - Non vested tokens
```

#### Total LDO supply

```ts
const totalSupply = await ldoContract.totalSupply();
```

#### LDO tokens in Lido treasury

```ts
const treasuryAddress = await lidoContract.getTreasury();
const treasuryBalance = await ldoContract.balanceOf(treasuryAddress);
```

#### Non vested tokens

To calculate the number of non vested tokens, we first get all the members of the vesting program using events emitted on the token manager contract:

```ts
const newFilter = tmContract.filters.NewVesting();
const revokeFilter = tmContract.filters.RevokeVesting();

/**
 * Since we get updates only for new blocks while the server is running,
 * we also look at RevokeVesting events to make sure that vestings will be
 * updated in the case of a vesting revoke
 */

const [newEvents, revokeEvents] = await Promise.all([
  tmContract.queryFilter(newFilter),
  tmContract.queryFilter(revokeFilter),
]);

const vestingMembers = new Set<string>();

newEvents.forEach((event) => vestingMembers.add(event.args.receiver));
revokeEvents.forEach((event) => vestingMembers.add(event.args.receiver));
```

Then for each updated member we get the number of their vestings:

```ts
const vestingsLength = await tmContract.vestingsLengths(member);
```

Then we get information on each vesting of the member:

```ts
const vestingInfo = await tmContract.getVesting(member, vestingId);
```

At this step we have all the information to calculate the number of non vested tokens. But there may be more tokens in the vesting than on the member's balance, in case the tokens have been burned. That's why we collect all token burning events:

```ts
const filter = this.ldoContract.filters.Transfer(null, AddressZero);
const events = await this.ldoContract.queryFilter(filter);

const burnsAddresses = new Set<string>();
events.forEach((event) => burnsAddresses.add(event.args._from));
```

For all addresses where tokens were burned, we update the member's balance:

```ts
const memberBalance = await ldoContract.balanceOf(holderAddress);
```

Then we calculate the amount of non vested tokens at a specific time using the same code as in the [TokenManager.sol](https://github.com/aragon/aragon-apps/blob/6f581bf8ec43697c481f3692127f2ed0a2fba9de/apps/token-manager/contracts/TokenManager.sol#L358) contract. For each member we check the calculated number of non vested tokens from all of his vestings against his LDO balance and use the minimum of these values:

```ts
const lockedTokens = balance.lt(nonVested) ? balance : nonVested;
```

Finally we sum up all locked tokens.

### stETH

Circ supply for stETH equals stETH total supply

```ts
const totalSupply = await lidoContract.totalSupply();
```

### wstETH

Circ supply for wstETH equals wstETH total supply

```ts
const totalSupply = await wstethContract.totalSupply();
```

### stXXX

TODO: add other chains support

## Data updating

Data on all endpoints is updated once per minute.

## Development

Step 1. Copy the contents of `sample.env` to `.env`:

```bash
cp sample.env .env
```

Step 2. Install dependencies:

```bash
$ yarn install
```

Step 3. Start the development server

```bash
$ yarn start:dev
```

## Running the app

```bash
# development
$ yarn start

# watch mode
$ yarn start:dev

# production mode
$ yarn start:prod
```

## Test

```bash
# unit tests
$ yarn test

# e2e tests
$ yarn test:e2e

# test coverage
$ yarn test:cov
```

## Environment variables

The following variables are required for the service to work:

```
CHAIN_ID=<chain id>
EL_API_URLS=<rpc urls>
```

## License

Lido Circ Supply is [MIT licensed](LICENSE).
