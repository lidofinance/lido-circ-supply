# Lido Circ Supply

Service returns circulating supply for Lido tokens.

## Endpoints

API service is deployed in the mainnet and testnet chains. A list of available endpoints can be found in the Swagger:

- Mainnet: https://circ-supply.lido.fi/api
- Goerli: https://circ-supply.testnet.fi/api

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

## Development

The app is in maintenance mode: it receives dependency, security and bug fixes only. The
tooling below exists so that those changes can be shipped with confidence.

Step 1. Use Node 22 (see `.nvmrc`) and copy the contents of `sample.env` to `.env`:

```bash
$ cp sample.env .env
```

Step 2. Install dependencies. This also installs the git hooks (husky):

```bash
$ yarn install
```

Step 3. Start the development server

```bash
$ yarn start:dev
```

### Git hooks

| Hook         | Runs                                                 |
| ------------ | ---------------------------------------------------- |
| `pre-commit` | `eslint --fix` and `prettier` on the staged files    |
| `commit-msg` | Conventional Commits format check (see Release flow) |
| `pre-push`   | `yarn typecheck` and the unit tests                  |

The release tooling derives the version bump and the changelog from the commit types, so
commits must follow [Conventional Commits](https://www.conventionalcommits.org): `fix:` and
`fix(deps):` produce a patch release, `feat:` a minor one.

Skip the hooks once with `git commit --no-verify` when you have to; CI runs the same checks anyway.

### Checks

```bash
$ yarn lint:check     # eslint, no fixes
$ yarn format:check   # prettier, no fixes
$ yarn typecheck      # tsc --noEmit over src and test
$ yarn test           # unit tests
$ yarn test:cov       # unit tests with coverage
$ yarn test:e2e       # boots the whole app against fake RPC and contracts
```

The e2e suite (`src/app/app.e2e-spec.ts`) is the main regression net for dependency bumps:
it wires the real module graph, versioned routes, cache and `Cache-Control` headers, rate
limiting, CORS, probes, metrics and Swagger. Unit specs sit next to the code they cover; the
LDO locked-amount pipeline is covered end to end with fake contracts in
`src/tokens/ldo/vesting.service.spec.ts`.

### CI

Every pull request and every push to `develop` and `main` runs ("Tests and linters"):

- lint, formatting, typecheck, build, unit and e2e tests;
- `yarn audit` on production dependencies, failing on high or critical advisories;
- a Docker build of the runtime image, checking that `dist/main.js` is there and no package
  manager is.

"Tests and Checks" runs the shared Lido security, Docker and Actions linters.

Dependabot opens weekly PRs for npm packages (minor and patch updates grouped, majors
separate), GitHub Actions and the Docker base image. Their commit messages already follow
Conventional Commits, so merging them feeds the release changelog.

## Running the app

```bash
# development
$ yarn start

# watch mode
$ yarn start:dev

# production mode
$ yarn start:prod
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
| LOG_LEVEL             | No       | `info`        | Log level: debug, info, notice, warning or error             |
| LOG_FORMAT            | No       | `json`        | Log format: simple or json                                   |
| TOKEN_UPDATE_CRON     | No       | `*/1 * * * *` | Token update cron job interval                               |

The `sample.env` file contains examples of variable values.

## License

Lido Circ Supply is [MIT licensed](LICENSE).

## Release flow

To create new release:

1. Merge all changes to the `main` branch
1. Navigate to Repo => Actions
1. Run action "Prepare release" action against `main` branch
1. When action execution is finished, navigate to Repo => Pull requests
1. Find pull request named "chore(release): X.X.X" review and merge it with "Rebase and merge" (or "Squash and merge")
1. After merge release action will be triggered automatically
1. Navigate to Repo => Actions and see last actions logs for further details

The release also builds the k8s prod image ("CI K8s Prod") and pushes it to the prod registry as
`<tag>`. To rebuild an existing tag, run "CI K8s Prod" manually and pick the tag in "Use workflow from".
