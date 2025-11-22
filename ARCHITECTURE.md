# ARCHITECTURE.md - Deep Dive into Actual's Core Systems

This document provides detailed explanations of Actual's core architectural systems. For general development workflow and patterns, see [AGENTS.md](./AGENTS.md).

## Table of Contents

- [CRDT Synchronization](#crdt-synchronization)
- [AQL Query System](#aql-query-system)
- [Client-Server Communication](#client-server-communication)
- [Platform Abstraction](#platform-abstraction)
- [Database Schema & Migrations](#database-schema--migrations)

## CRDT Synchronization

Actual uses CRDT (Conflict-free Replicated Data Type) synchronization to enable multi-device sync without conflicts. This allows multiple clients to make changes offline and seamlessly merge them when syncing.

### How CRDT Sync Works

The sync system is based on a **merkle trie** structure that tracks all changes. Each change is represented as a `Message` with:

- `dataset`: The table name (e.g., `transactions`, `accounts`)
- `row`: The row ID
- `column`: The column name
- `timestamp`: A unique timestamp that determines ordering
- `value`: The new value

```248:255:packages/loot-core/src/server/sync/index.ts
export type Message = {
  dataset: string;
  row: string;
  column: string;
  timestamp: Timestamp;
  value: string | number | null;
};
```

### Message Application

Messages are applied atomically in a database transaction to maintain consistency:

```257:381:packages/loot-core/src/server/sync/index.ts
export const applyMessages = sequential(async (messages: Message[]) => {
  if (checkSyncingMode('import')) {
    applyMessagesForImport(messages);
    return undefined;
  } else if (checkSyncingMode('enabled')) {
    // Compare the messages with the existing crdt. This filters out
    // already applied messages and determines if a message is old or
    // not. An "old" message doesn't need to be applied, but it still
    // needs to be put into the merkle trie to maintain the hash.
    messages = await compareMessages(messages);
  }

  messages = [...messages].sort((m1, m2) => {
    const t1 = m1.timestamp ? m1.timestamp.toString() : '';
    const t2 = m2.timestamp ? m2.timestamp.toString() : '';
    if (t1 < t2) {
      return -1;
    } else if (t1 > t2) {
      return 1;
    }
    return 0;
  });

  const idsPerTable = {};
  messages.forEach(msg => {
    if (msg.dataset === 'prefs') {
      return;
    }

    if (idsPerTable[msg.dataset] == null) {
      idsPerTable[msg.dataset] = [];
    }
    idsPerTable[msg.dataset].push(msg.row);
  });

  async function fetchData(): Promise<DataMap> {
    const data = new Map();

    for (const table of Object.keys(idsPerTable)) {
      const rows = await fetchAll(table, idsPerTable[table]);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setIn(data, [table, row.id], row);
      }
    }

    return data;
  }

  const prefsToSet: MetadataPrefs = {};
  const oldData = await fetchData();

  undo.appendMessages(messages, oldData);

  // It's important to not mutate the clock while processing the
  // messages. We only want to mutate it if the transaction succeeds.
  // The merkle variable will be updated while applying the messages and
  // we'll apply it afterwards.
  let clock;
  let currentMerkle;
  if (checkSyncingMode('enabled')) {
    clock = getClock();
    currentMerkle = clock.merkle;
  }

  if (sheet.get()) {
    sheet.get().startCacheBarrier();
  }

  // Now that we have all of the data, go through and apply the
  // messages carefully. This transaction is **crucial**: it
  // guarantees that everything is atomically committed to the
  // database, and if any part of it fails everything aborts and
  // nothing is changed. This is critical to maintain consistency. We
  // also avoid any side effects to in-memory objects, and apply them
  // after this succeeds.
  db.transaction(() => {
    const added = new Set();

    for (const msg of messages) {
      const { dataset, row, column, timestamp, value } = msg;

      if (!msg.old) {
        apply(msg, getIn(oldData, [dataset, row]) || added.has(dataset + row));

        if (dataset === 'prefs') {
          prefsToSet[row] = value;
        } else {
          // Keep track of which items have been added it in this sync
          // so it knows whether they already exist in the db or not. We
          // ignore any changes to the spreadsheet.
          added.add(dataset + row);
        }
      }

      if (checkSyncingMode('enabled')) {
        db.runQuery(
          db.cache(`INSERT INTO messages_crdt (timestamp, dataset, row, column, value)
           VALUES (?, ?, ?, ?, ?)`),
          [timestamp.toString(), dataset, row, column, serializeValue(value)],
        );

        currentMerkle = merkle.insert(currentMerkle, timestamp);
      }

      // Special treatment for some synced prefs
      if (dataset === 'preferences' && row === 'budgetType') {
        setBudgetType(value);
      }
    }

    if (checkSyncingMode('enabled')) {
      currentMerkle = merkle.prune(currentMerkle);

      // Save the clock in the db first (queries might throw
      // exceptions)
      db.runQuery(
        db.cache(
          'INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)',
        ),
        [serializeClock({ ...clock, merkle: currentMerkle })],
      );
    }
  });
```

### Sync Process

The full sync process (`fullSync`) works by:

1. Getting messages since the last sync timestamp
2. Encoding them into a binary format (Protocol Buffers)
3. Sending to the sync server
4. Receiving new messages from the server
5. Applying received messages
6. Repeating until merkle hashes match (meaning clients are in sync)

```623:794:packages/loot-core/src/server/sync/index.ts
async function _fullSync(
  sinceTimestamp: string,
  count: number,
  prevDiffTime: number,
): Promise<Message[]> {
  const {
    id: currentId,
    cloudFileId,
    groupId,
    lastSyncedTimestamp,
  } = prefs.getPrefs() || {};

  clearFullSyncTimeout();

  if (
    checkSyncingMode('disabled') ||
    checkSyncingMode('offline') ||
    !currentId
  ) {
    return [];
  }

  // Snapshot the point at which we are currently syncing
  const currentTime = getClock().timestamp.toString();

  const since =
    sinceTimestamp ||
    lastSyncedTimestamp ||
    // Default to 5 minutes ago
    new Timestamp(Date.now() - 5 * 60 * 1000, 0, '0').toString();

  const messages = getMessagesSince(since);

  const userToken = await asyncStorage.getItem('user-token');

  logger.info(
    'Syncing since',
    since,
    messages.length,
    '(attempt: ' + count + ')',
  );

  const buffer = await encoder.encode(groupId, cloudFileId, since, messages);

  // TODO: There a limit on how many messages we can send because of
  // the payload size. Right now it's at 20MB on the server. We should
  // check the worst case here and make multiple requests if it's
  // really large.
  const resBuffer = await postBinary(
    getServer().SYNC_SERVER + '/sync',
    buffer,
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );

  // Abort if the file is either no longer loaded, the group id has
  // changed because of a sync reset
  if (!prefs.getPrefs() || prefs.getPrefs().groupId !== groupId) {
    return [];
  }

  const res = await encoder.decode(resBuffer);

  logger.info('Got messages from server', res.messages.length);

  const localTimeChanged = getClock().timestamp.toString() !== currentTime;

  // Apply the new messages
  let receivedMessages: Message[] = [];
  if (res.messages.length > 0) {
    receivedMessages = await receiveMessages(
      res.messages.map(msg => ({
        ...msg,
        value: deserializeValue(msg.value as string),
      })),
    );
  }

  const diffTime = merkle.diff(res.merkle, getClock().merkle);

  if (diffTime !== null) {
    // This is a bit wonky, but we loop until we are in sync with the
    // server. While syncing, either the client or server could change
    // out from under us, so it might take a couple passes to
    // completely sync up. This is a check that stops the loop in case
    // we are corrupted and can't sync up. We try 10 times if we keep
    // getting the same diff time, and add a upper limit of 300 no
    // matter what (just to stop this from ever being an infinite
    // loop).
    //
    // It's slightly possible for the user to add more messages while we
    // are in `receiveMessages`, but `localTimeChanged` would still be
    // false. In that case, we don't reset the counter but it should be
    // very unlikely that this happens enough to hit the loop limit.

    if ((count >= 10 && diffTime === prevDiffTime) || count >= 100) {
      logger.info('SENT -------');
      logger.info(JSON.stringify(messages));
      logger.info('RECEIVED -------');
      logger.info(JSON.stringify(res.messages));

      const rebuiltMerkle = rebuildMerkleHash();

      logger.log(
        count,
        'messages:',
        messages.length,
        messages.length > 0 ? messages[0] : null,
        'res.messages:',
        res.messages.length,
        res.messages.length > 0 ? res.messages[0] : null,
        'clientId',
        getClock().timestamp.node(),
        'groupId',
        groupId,
        'diffTime:',
        diffTime,
        diffTime === prevDiffTime,
        'local clock:',
        getClock().timestamp.toString(),
        getClock().merkle.hash,
        'rebuilt hash:',
        rebuiltMerkle.numMessages,
        rebuiltMerkle.trie.hash,
        'server hash:',
        res.merkle.hash,
        'localTimeChanged:',
        localTimeChanged,
      );

      if (rebuiltMerkle.trie.hash === res.merkle.hash) {
        // Rebuilding the merkle worked... but why?
        const clocks = await db.all<db.DbClockMessage>(
          'SELECT * FROM messages_clock',
        );
        if (clocks.length !== 1) {
          logger.log('Bad number of clocks:', clocks.length);
        }
        const hash = deserializeClock(clocks[0].clock).merkle.hash;
        logger.log('Merkle hash in db:', hash);
      }

      throw new SyncError('out-of-sync');
    }

    receivedMessages = receivedMessages.concat
```

### Why CRDTs?

CRDTs enable:

- **Offline-first**: Changes work offline and sync later
- **No conflicts**: Timestamps ensure deterministic ordering
- **Eventual consistency**: All devices converge to the same state
- **Efficient sync**: Merkle trie allows incremental sync

## AQL Query System

Actual uses a custom query language called **AQL (Actual Query Language)** that compiles to SQL. It provides a type-safe, optimized way to query the database with automatic dependency tracking.

### Schema Definition

The schema defines tables, fields, and relationships:

```34:59:packages/loot-core/src/server/aql/schema/index.ts
export const schema = {
  transactions: {
    id: f('id'),
    is_parent: f('boolean'),
    is_child: f('boolean'),
    parent_id: f('id'),
    account: f('id', { ref: 'accounts', required: true }),
    category: f('id', { ref: 'categories' }),
    amount: f('integer', { default: 0, required: true }),
    payee: f('id', { ref: 'payees' }),
    notes: f('string'),
    date: f('date', { required: true }),
    imported_id: f('string'),
    error: f('json'),
    imported_payee: f('string'),
    starting_balance_flag: f('boolean'),
    transfer_id: f('id'),
    sort_order: f('float', { default: () => Date.now() }),
    cleared: f('boolean', { default: true }),
    reconciled: f('boolean', { default: false }),
    tombstone: f('boolean'),
    schedule: f('id', { ref: 'schedules' }),
    raw_synced_data: f('string'),
    // subtransactions is a special field added if the table has the
    // `splits: grouped` option
  },
```

### Query Compilation

Queries are compiled to SQL with optimizations:

```1058:1124:packages/loot-core/src/server/aql/compiler.ts
export function compileQuery(
  queryState: QueryState,
  schema: Schema,
  schemaConfig: SchemaConfig = {},
) {
  const { withDead, validateRefs = true, tableOptions, rawMode } = queryState;

  const {
    tableViews = {},
    tableFilters = () => [],
    customizeQuery = queryState => queryState,
  } = schemaConfig;

  const internalTableFilters = name => {
    const filters = tableFilters(name);
    // These filters cannot join tables and must be simple strings
    for (const filter of filters) {
      if (Array.isArray(filter)) {
        throw new CompileError(
          'Invalid internal table filter: only object filters are supported',
        );
      }
      if (Object.keys(filter)[0].indexOf('.') !== -1) {
        throw new CompileError(
          'Invalid internal table filter: field names cannot contain paths',
        );
      }
    }
    return filters;
  };

  const tableRef = (name: string, isJoin?: boolean) => {
    const view =
      typeof tableViews === 'function'
        ? tableViews(name, { withDead, isJoin, tableOptions })
        : tableViews[name];
    return view || name;
  };

  const tableName = queryState.table;

  const {
    filterExpressions,
    selectExpressions,
    groupExpressions,
    orderExpressions,
    limit,
    offset,
  } = customizeQuery(queryState);

  let select = '';
  let where = '';
  let joins = '';
  let groupBy = '';
  let orderBy = '';
  const state: CompilerState = {
    schema,
    implicitTableName: tableName,
    implicitTableId: tableRef(tableName),
    paths: new Map(),
    dependencies: [tableName],
    compileStack: [],
    outputTypes: new Map(),
    validateRefs,
    namedParameters: [],
  };

  resetUid();

  try {
    select = compileSelect
```

### Custom Executors

Some tables (like `transactions`) have custom executors for performance, especially for split transactions:

```49:112:packages/loot-core/src/server/aql/exec.ts
export type AqlQueryExecutor = (
  compilerState: CompilerState,
  queryState: QueryState,
  sqlPieces: SqlPieces,
  params: (string | number)[],
  outputTypes: OutputTypes,
) => Promise<Record<string, unknown>[]>;

export type RunCompiledAqlQueryOptions = {
  params?: AqlQueryParams;
  executors?: Record<string, AqlQueryExecutor>;
};

export async function runCompiledAqlQuery(
  queryState: QueryState,
  sqlPieces: SqlPieces,
  compilerState: CompilerState,
  { params = {}, executors = {} }: RunCompiledAqlQueryOptions = {},
) {
  const paramArray = compilerState.namedParameters.map(param => {
    const name = param.paramName;
    if (params[name] === undefined) {
      throw new Error(`Parameter ${name} not provided to query`);
    }
    return convertInputType(params[name], param.paramType);
  });

  let data: Record<string, unknown>[] = [];
  if (executors[compilerState.implicitTableName]) {
    data = await executors[compilerState.implicitTableName](
      compilerState,
      queryState,
      sqlPieces,
      paramArray,
      compilerState.outputTypes,
    );
  } else {
    data = await execQuery(
      queryState,
      compilerState,
      sqlPieces,
      paramArray,
      compilerState.outputTypes,
    );
  }

  if (queryState.calculation) {
    if (data.length > 0) {
      const row = data[0];
      const k = Object.keys(row)[0];
      // TODO: the function being run should be the one to
      // determine the default value, not hardcoded as 0
      return row[k] || 0;
    } else {
      return null;
    }
  }

  return data;
}
```

### Dependency Tracking

Queries return dependencies that allow the system to know which data a UI component depends on, enabling automatic invalidation when data changes.

## Client-Server Communication

Actual uses different communication mechanisms depending on the platform:

### Electron (Desktop)

Uses **IPC (Inter-Process Communication)** between the main process and renderer:

```81:107:packages/loot-core/src/platform/client/fetch/index.ts
export const send: T.Send = function (
  ...params: Parameters<T.Send>
): ReturnType<T.Send> {
  const [name, args, { catchErrors = false } = {}] = params;
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    replyHandlers.set(id, { resolve, reject });

    if (socketClient) {
      socketClient.emit('message', {
        id,
        name,
        args,
        undoTag: undo.snapshot(),
        catchErrors: !!catchErrors,
      });
    } else {
      messageQueue.push({
        id,
        name,
        args,
        undoTag: undo.snapshot(),
        catchErrors,
      });
    }
  });
};
```

The server side handles messages:

```16:78:packages/loot-core/src/platform/server/connection/index.electron.ts
export const init: T.Init = function (_socketName, handlers) {
  process.parentPort.on('message', ({ data }) => {
    const { id, name, args, undoTag, catchErrors } = data;

    if (handlers[name]) {
      runHandler(handlers[name], args, { undoTag, name }).then(
        result => {
          if (catchErrors) {
            result = { data: result, error: null };
          }

          process.parentPort.postMessage({
            type: 'reply',
            id,
            result,
            mutated:
              isMutating(handlers[name]) && name !== 'undo' && name !== 'redo',
            undoTag,
          });
        },
        nativeError => {
          const error = coerceError(nativeError);

          if (name.startsWith('api/')) {
            // The API is newer and does automatically forward
            // errors
            process.parentPort.postMessage({
              type: 'reply',
              id,
              error,
            });
          } else if (catchErrors) {
            process.parentPort.postMessage({
              type: 'reply',
              id,
              result: { error, data: null },
            });
          } else {
            process.parentPort.postMessage({ type: 'error', id });
          }

          if (error.type === 'InternalError' && name !== 'api/load-budget') {
            captureException(nativeError);
          }

          if (!catchErrors) {
            // Notify the frontend that something bad happend
            send('server-error');
          }
        },
      );
    } else {
      console.warn('Unknown method: ' + name);
      captureException(new Error('Unknown server method: ' + name));
      process.parentPort.postMessage({
        type: 'reply',
        id,
        result: null,
        error: APIError('Unknown method: ' + name),
      });
    }
  });
};
```

### Browser (Web)

Uses **Web Workers** for background processing:

```156:177:packages/loot-core/src/platform/client/fetch/index.browser.ts
export const send: T.Send = function (
  ...params: Parameters<T.Send>
): ReturnType<T.Send> {
  const [name, args, { catchErrors = false } = {}] = params;
  return new Promise((resolve, reject) => {
    const id = uuidv4();

    replyHandlers.set(id, { resolve, reject });
    const message = {
      id,
      name,
      args,
      undoTag: undo.snapshot(),
      catchErrors,
    };
    if (messageQueue) {
      messageQueue.push(message);
    } else {
      globalWorker.postMessage(message);
    }
  });
};
```

### Mutation Tracking

All mutations are automatically tracked for undo/redo. The `undoTag` is sent with each request to associate the mutation with a snapshot of the UI state.

## Platform Abstraction

Actual uses platform-specific exports to handle differences between Electron and web:

```75:112:packages/loot-core/package.json
    "./platform/client/fetch": {
      "node": "./src/platform/client/fetch/index.ts",
      "default": "./src/platform/client/fetch/index.browser.ts"
    },
    "./platform/client/undo": "./src/platform/client/undo/index.ts",
    "./platform/exceptions": "./src/platform/exceptions/index.ts",
    "./platform/server/asyncStorage": "./src/platform/server/asyncStorage/index.ts",
    "./platform/server/connection": "./src/platform/server/connection/index.ts",
    "./platform/server/fetch": "./src/platform/server/fetch/index.web.ts",
    "./platform/server/fs": "./src/platform/server/fs/index.web.ts",
    "./platform/server/log": "./src/platform/server/log/index.web.ts",
    "./platform/server/sqlite": "./src/platform/server/sqlite/index.web.ts",
```

Platform-specific files use extensions like `.electron.ts` or `.web.ts` and are resolved at build time via the package.json `exports` field.

## Database Schema & Migrations

The database schema is defined in SQL and evolved through migrations:

```1:88:packages/loot-core/src/server/sql/init.sql
CREATE TABLE created_budgets (month TEXT PRIMARY KEY);

CREATE TABLE spreadsheet_cells
 (name TEXT PRIMARY KEY,
  expr TEXT,
  cachedValue TEXT);

CREATE TABLE banks
 (id TEXT PRIMARY KEY,
  bank_id TEXT,
  name TEXT,
  tombstone INTEGER DEFAULT 0);

CREATE TABLE accounts
   (id TEXT PRIMARY KEY,
    account_id TEXT,
    name TEXT,
    balance_current INTEGER,
    balance_available INTEGER,
    balance_limit INTEGER,
    mask TEXT,
    official_name TEXT,
    type TEXT,
    subtype TEXT,
    bank TEXT,
    offbudget INTEGER DEFAULT 0,
    closed INTEGER DEFAULT 0,
    tombstone INTEGER DEFAULT 0);

CREATE TABLE pending_transactions
  (id TEXT PRIMARY KEY,
   acct INTEGER,
   amount INTEGER,
   description TEXT,
   date TEXT,
   FOREIGN KEY(acct) REFERENCES accounts(id));

CREATE TABLE transactions
  (id TEXT PRIMARY KEY,
   isParent INTEGER DEFAULT 0,
   isChild INTEGER DEFAULT 0,
   acct TEXT,
   category TEXT,
   amount INTEGER,
   description TEXT,
   notes TEXT,
   date INTEGER,
   financial_id TEXT,
   type TEXT,
   location TEXT,
   error TEXT,
   imported_description TEXT,
   starting_balance_flag INTEGER DEFAULT 0,
   transferred_id TEXT,
   sort_order REAL,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE categories
 (id TEXT PRIMARY KEY,
  name TEXT,
  is_income INTEGER DEFAULT 0,
  cat_group TEXT,
  sort_order REAL,
  tombstone INTEGER DEFAULT 0);

CREATE TABLE category_groups
   (id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    is_income INTEGER DEFAULT 0,
    sort_order REAL,
    tombstone INTEGER DEFAULT 0);

CREATE TABLE messages_crdt
 (id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL UNIQUE,
  dataset TEXT NOT NULL,
  row TEXT NOT NULL,
  column TEXT NOT NULL,
  value BLOB NOT NULL);

CREATE TABLE category_mapping
  (id TEXT PRIMARY KEY,
   transferId TEXT);

CREATE TABLE messages_clock (id INTEGER PRIMARY KEY, clock TEXT);

CREATE TABLE db_version (version TEXT PRIMARY KEY);
CREATE TABLE __migrations__ (id INT PRIMARY KEY NOT NULL);
```

Migrations are timestamped SQL files in `packages/loot-core/migrations/` that are automatically applied on startup. Each migration file is named with a timestamp prefix to ensure they run in order.

See also: [DATA-FLOW.md](./DATA-FLOW.md), [DOMAIN-LOGIC.md](./DOMAIN-LOGIC.md), [AGENTS.md](./AGENTS.md)
