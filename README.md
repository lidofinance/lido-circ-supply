# Lido Circ Supply

Service returns circulating supply for Lido tokens.

## Endpoints

API service is deployed on Ethereum mainnet and the Hoodi testnet. A list of available endpoints can be found in the Swagger:

- Mainnet: https://circ-supply.lido.fi/api
- Hoodi: https://circ-supply-hoodi.testnet.fi/api

## Circ supply calculations

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
const circSupply = totalSupply;
```

### wstETH

Circ supply for wstETH equals wstETH total supply

```ts
const totalSupply = await wstethContract.totalSupply();
const circSupply = totalSupply;
```

### stXXX

TODO: add other chains support

## Data updating

The data for all endpoints is updated by the cron job. The update interval is set via env variable `TOKEN_UPDATE_CRON`, which defaults `*/1 * * * *`.

### LDO events snapshot

On mainnet the LDO burn and vesting scans start from `src/tokens/ldo/snapshots/mainnet.json`: the addresses derived from LDO events from the deploy block up to `toBlock`. Only blocks after `toBlock` are scanned on start. Both commands need an archive RPC that serves `eth_getLogs`:

```bash
# fails if the addresses differ from chain events up to toBlock
# CI passes MAINNET_RPC_URL here
EL_API_URLS=<rpc url> yarn ldo-snapshot:check

# move the snapshot forward to a finalized block (default: the current finalized block)
EL_API_URLS=<rpc url> yarn ldo-snapshot:update [toBlock]
```

Never edit the file by hand. A stale snapshot only makes the first scan longer.

## Development

Step 1. Copy the contents of `sample.env` to `.env`:

```bash
$ cp sample.env .env
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

| Variable              | Required | Default       | Description                                                  |
| --------------------- | -------- | :------------ | :----------------------------------------------------------- |
| EL_API_URLS           | Yes      |               | Execution layer RPC urls, separated by comma                 |
| CHAIN_ID              | Yes      |               | Execution layer chain id                                     |
| PORT                  | No       | `3000`        | App port                                                     |
| CORS_WHITELIST_REGEXP | No       |               | Regexp that checks which domains have access                 |
| GLOBAL_THROTTLE_TTL   | No       | `5`           | The number of seconds that each request will last in storage |
| GLOBAL_THROTTLE_LIMIT | No       | `100`         | The maximum number of requests within the TTL limit          |
| GLOBAL_CACHE_TTL      | No       | `1`           | Cache expiration time in seconds                             |
| SENTRY_DSN            | No       |               | Sentry DSN                                                   |
| LOG_LEVEL             | No       | `json`        | Log level: debug, info, notice, warning or error             |
| LOG_FORMAT            | No       | `debug`       | Log format: simple or json                                   |
| TOKEN_UPDATE_CRON     | No       | `*/1 * * * *` | Token update cron job interval                               |

The `sample.env` file contains examples of variable values.

## License

Lido Circ Supply is [MIT licensed](LICENSE).

## Release flow

Every merge to `main` creates or updates a draft release with the next version and the changelog
so far.

To create new release:

1. Navigate to Repo => Releases and open the draft. If there are several drafts, keep the highest version and delete the others
1. Review the version and the notes, and edit them if needed
1. Publish the release. This creates the tag on `main`
1. Publishing triggers the prod builds for both infras: "CI Build prod image" for the classic infra
   and "CI K8s Prod" for the k8s infra, which pushes the image to the prod registry as `<tag>`
1. Navigate to Repo => Actions and see last actions logs for further details

To rebuild the k8s image for an existing tag, run "CI K8s Prod" manually and pick the tag in "Use workflow from".
