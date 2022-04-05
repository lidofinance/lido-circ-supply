# Lido Circ Supply

Service returns circ supply for Lido tokens.

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
 * we also look at RevokeVesting events to make sure that programs will be
 * updated in the case of a vesting revoke
 */

const [newEvents, revokeEvents] = await Promise.all([
  tmContract.queryFilter(newFilter),
  tmContract.queryFilter(revokeFilter),
]);

const updatedMembers = new Set<string>();

newEvents.forEach((event) => updatedMembers.add(event.args.receiver));
revokeEvents.forEach((event) => updatedMembers.add(event.args.receiver));
```

Then for each member we get the number of their vestings:

```ts
const vestingsLength = await tmContract.vestingsLengths(member);
```

Then we get information on each vesting of the member:

```ts
const vestingInfo = await tmContract.getVesting(member, vestingId);
```

Then having all vestings for all members we calculate the total amount of non vested tokens at a specific time using the same code as in the [TokenManager.sol](https://github.com/aragon/aragon-apps/blob/6f581bf8ec43697c481f3692127f2ed0a2fba9de/apps/token-manager/contracts/TokenManager.sol#L358) contract.

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
