# Threadz

> Threadz now supports ESModules!

![npm](https://img.shields.io/npm/v/threadz) [![MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/mstephen19/threadz/blob/main/LICENSE) ![npm](https://img.shields.io/npm/dw/threadz)

![TypeScript](https://badgen.net/badge/-/TypeScript/blue?icon=typescript&label) [![CircleCI](https://circleci.com/gh/mstephen19/threadz.svg?style=svg)](https://app.circleci.com/pipelines/github/mstephen19/threadz) [![GitHub issues](https://img.shields.io/github/issues/mstephen19/threadz)](https://github.com/mstephen19/threadz/issues)

![Logo](https://i.imgur.com/L7158yF.jpg)

A feature rich and scalable general-purpose multi-threading library that makes it easy to utilize all of a given machine's resources in Node.js.

## New in v2.2.x

- New [`BackgroundThreadzWorker`](#backgroundthreadzworker) API.
- Various bug fixes.
- Minor improvements to the [`SharedMemory`](#sharedmemory) API.
- Support for both ESModules and CommonJS.
- Minor bug fixes & edge case handling.

## Table of Contents

- [Features](#features)
- [Installing](#installing)
- [Example](#example)
- [`declare`](#declare)
- [ThreadzAPI](#threadzapi)
- [`merge`](#merge)
- [`Interact` API](#interact-api)
- [`Communicate` API](#communicate-api)
- [`ThreadzWorker`](#threadzworker)
- [`BackgroundThreadzWorker`](#backgroundthreadzworker)
- [ThreadzPool](#threadzpool)
- [workerTools](#workertools)
- [`SharedMemory`](#sharedmemory)

## Features

- Full TypeScript support + in-editor documentation with JSDoc.
- Create modular workers without having to create specific worker files.
- Run operations with true concurrency by using workers in your code as if they were just regular functions that return promises.
- Automatically manage worker concurrency.
- Intuitively share memory between workers.
- Prioritize certain workers over others.
- Receive descriptive error messages that tell you exactly what you've done wrong.

## Installing

Threadz is currently only available on NPM.

```shell
npm i threadz
```

## Example

**declarations.ts:**

```TypeScript
import { declare } from 'threadz';

export default declare({
    bigLoop: {
        worker: (num: number) => {
            // Normally, a for loop is blocking code
            for (const _ of Array(900000000).keys()) {
            }
            return num + 100;
        },
    },
});
```

**index.ts:**

```TypeScript
import api from './declarations';

// Run the for loop on a separate thread
const data = await api.workers.bigLoop(5);
console.log(data);

console.log('this will run before the data is logged');
```

## `declare`

`(declarations: Declarations)` => [`ThreadzAPI`](#threadzapi)

Regardless of how you plan on using Threadz, the place you'll always need to start is the `declare()` function. Pass in a map of declarations where each key pertains to the name under which you'd like the function to be recognized.

```TypeScript
// declarations.ts
import { declare } from 'threadz';

export default declare({
    // The name of the worker
    helloWorld: {
        // The function to be run when the worker is called.
        worker: () => console.log('hello world'),

        // Whether or not to push the worker to the front of
        // the ThreadzPool queue when it is added.
        // Defaults to "false".
        priority: true,

        // Default options for the "Worker" class from the
        // "worker_threadz" module.
        options: {
            resourceLimits: {
                maxOldGenerationSizeMb: 0.5,
            },
        },
    },
    logMessage: {
        // The "worker" property is the only one required.
        worker: (msg: string) => console.log(msg),
    },
    returnSum: {
        worker: (num1: number, num2: number) => num1 + num2
    }
});
```

Declaration functions can also be asynchronous and return promises, which will be awaited within the worker. The function under the **worker** property doesn't have to be defined right within the `declare()` function. It can be imported from elsewhere.

To get a full list of the configurations supported in the **options** property, refer to the [Node.js documentation](https://nodejs.org/api/worker_threads.html#new-workerfilename-options).

> **Note:** Threadz will do its best to detect the path of the declaration file, but sometimes it might fail. In rare cases like these, you can manually pass a `fileLocation` string within the second parameter.
> **Note:** The return value of the `declare()` function **MUST** be the default export of the file.
> **Note:** Unfortunately, declaration functions cannot accept generic types.

## ThreadzAPI

The `declare()` function returns an instance of `ThreadzAPI`, off of which your workers can be called. During initialization, declaration functions are mapped into the `threadzAPI.workers` property, where they can be referenced by the names used in the original declarations. Using the declarations in the above section, this code would be valid:

```TypeScript
// index.ts
import api from './declarations';

// Each of these operations is happening on a separate thread
await api.workers.logMessage('threadz is awesome');
await api.workers.helloWorld();

// The return value of a worker function is a promise of
// the return value of the original declaration function
// it corresponds to.
const data = await api.workers.returnSum(4, 5)

console.log(data) // -> 9
```

### Methods & properties

- **`location`**: _`string`_
  - The file location at which the declarations live.
  - Tells Threadz how to dynamically import your declarations.
- **`declarations`**: _[`Declarations`](#declare)_
  - The original declarations used to initialize `ThreadsAPI`.
- **`declarationsCount`**: _`number`_
  - The number of declarations on the `ThreadzAPI` instance.
- **`workers`**: _`MappedWorkers`_
  - Declarations mapped into "worker functions" which handle the passing of data, the creation of `Worker` instances, the management of worker concurrency with ThreadzPool, and more.
- **`threadzPool`**: _[`ThreadzWorkerPool`](#threadzpool)_
  - The global `ThreadzWorkerPool` instance being used to manage all workers.
- **`interactWith()`**: _`(workerName: string)` => [`Interact`](#interact-api)_
  - Pass in the name of a worker on the `ThreadzAPI` instance to create an interaction session for that worker with the `Interact` API.
- **`createBackgroundWorker()`**: _`()` => [`BackgroundThreadzWorker`](#backgroundthreadzworker)_
- **`on()`**: `(callback: Function)` => `void`
  - Supports the `workerQueued` and `workerDone` methods.

## `merge`

`(instances: ThreadzAPI[])` => `Declarations`

The `merge` function is a simple function that accepts an array of ThreadzAPI instances returned by the `declare` function and returns a new declarations object containing all declarations from each instance provided in the array.

> **Note:** `merge` does **not** return a ThreadzAPI instance like `declare!` It returns a set of declarations to be re-declared.

**Example:**

**declarations.ts**

```TypeScript
import { declare, merge } from 'threadz';

const math = declare({
    add5: {
        worker: (num1: number) => num1 + 5,
    },
});

const logging = declare({
    helloWorld: {
        worker: () => 'hello world',
    },
});

export default declare(merge([math, logging]));
```

**index.ts**

```TypeScript
import api from './declarations';

await api.workers.add5(5);
await api.workers.helloWorld();
```

> **Note:** if you are only using the `declare` function to create a ThreadzAPI instance with the sole intention of using it later in the `merge` function to be re-declared, it does not have to be the default export of the file it is in.

## `Interact` API

Directly calling workers on `threadzAPI.workers` allows for the ability to pass arguments to a function, run it on a separate thread, then receive its return value back on the main thread. For any workflows more complex than this, the `Interact` API must be used.

Initialize an interaction session with the `Interact.with()` static method, passing in a worker function from a `ThreadzAPI` instance. An `Interact` instance tied to that worker function will be returned.

```TypeScript
import { Interact } from 'threadz';
import api from './declarations';

// Initialize the interact session, specifying which worker
// to run the interaction with.
const interact = Interact.with(api.workers.returnSum);

// Pass in arguments to the worker and mark it as a priority.
interact.args(4, 5).isPriority();

// Run callbacks when certain worker events have occurred.
interact.onStart(() => console.log('Worker started'));
interact.onSuccess((result) => console.log(result));

// Queue the worker into the ThreadzPool and run it.
const worker = interact.go();

// Wait for the worker to finish running
await worker.waitFor();
```

### Methods

An instance of the `Interact` API has many methods that make it easy to interact with a worker, all of which can be chained.

#### `args()`

Pass arguments into the worker.

#### `isPriority()`

This means that it will be pushed to the front of the [ThreadzPool](#threadzpool) queue instead of the back. Overrides the **priority** option set in the original declarations.

#### `isNotPriority()`

Treat the worker as normal. You only need to use this method if you set `priority` to `true` in the original declaration.

#### `setOptions()`

`(options: WorkerOptions)` => `Interact`

Set the options for the worker's run. Overrides any options defined within the original declaration.

#### `setOptionsWithPrevious()`

`(callback: (options: WorkerOptions) => WorkerOptions)` => `Interact`

Set the options for the worker's run with a callback. Overrides any options defined within the original declaration.

#### `addMessagePort()`

> This function is documented and readily available; however it is recommended to use the [`Communicate`](#communicate-api) API instead.

`(port: MessagePort)` => `Interact`

Add a message port to the worker to be accessed by [`workerTools.sendCommunication`](#workertools) and `workerTools.onCommunication`.

**Example:**

```TypeScript
import { MessageChannel } from 'worker_threads';
import api from './declarations';

const { port1, port2 } = new MessageChannel();

const worker = api.interactWith('test').addMessagePort(port2).go();

port1.on('message', (data) => console.log(data));

await worker.waitFor();
```

#### `go()`

`()` => [`ThreadzWorker`](#threadzworker)

Create the worker and queue it up in the ThreadzPool to be run. Returns a `ThreadzWorker` instance.

#### Events

- **`onMessage()`**
  - Pass a function to run when a message is received from the worker.
- **`onFailure()`**
  - Pass a function to run when the worker fails and throws an error.
- **`onSuccess()`**
  - Pass a function to run when the worker succeeds and potentially returns a value.
- **`onStart()`**
  - Pass a function to run when the worker starts running.
  - This functionality might be useful when dealing with large queues of workers.
- **`onAbort()`**
  - Pass a function to run whenever the worker is aborted.
  - A worker can only be aborted with the [`workerTools.abort()`](#workertools) and `workerTools.abortOnTimeout()` functions.

## `Communicate` API

The `Communicate` class is a simple class that acts as a Threadz-specific wrapper for the [`MessageChannel` class](https://nodejs.org/api/worker_threads.html#class-messagechannel) from the `worker_threads` module in Node.js. Pass in [`Interact`](#interact-api) instances and automatically create a `MessageChannel` instance and add the ports to the `Interact` instances with `interact.addMessagePort()`

```TypeScript
import { Communicate } from 'threadz';
import api from './declarations';

const add5 = api.interactWith('add5').args(10);
const helloWorld = api.interactWith('helloWorld');

const communicate = Communicate.between([add5, helloWorld]);

add5.go();
helloWorld.go();

communicate.on('message', (data) => console.log(data));

communicate.closePorts();
```

In the `between` static method, you can either pass in a tuple of two `Interact` instances, or an object with `port1` and `port2` keys, each containing an array of `Interact` instances. The instances under each key will automatically be passed the corresponding port.

```TypeScript
// Instead of this
const { port1, port2 } = new MessageChannel();
add5.addMessagePort(port1);
helloWorld.addMessagePort(port2);

// Communicate allows you to do this instead
const communicate = Communicate.between([add5, helloWorld]);
```

This becomes more useful when trying to create communications between a larger number of workers.

## `ThreadzWorker`

When a `ThreadzWorker` instance is returned by the [`Interact` API](#interact-api), it represents a worker that has been queued into the [`ThreadzWorkerPool`](#threadzpool) to be executed.

```TypeScript
import { Interact } from 'threadz';
import api from './declarations';

const interact = Interact.with(api.workers.returnSum).args(4, 5);
const worker = interact.go();

worker.sendMessage('foo');
```

> **Note:** Other than with the `Interact` API, you should not be directly working with `ThreadzWorker` instances.

### Methods & properties

Since the `ThreadzWorker` API is not meant to be interacted with extensively, a limited number of methods are available.

#### `isRunning`

A boolean indicating whether or not the worker is running yet.

#### `sendMessage()`

`(data: AcceptableDataType | SharedMemoryTransferObject, transferList?: TransferListItem[])` => `void`

Send a message to the worker while it is running by passing in a basic data type or a [`SharedMemoryTransferObject`](#sharedmemory).

#### `setPriority()`

`(priority: boolean | 0 | 1)` => `void`

Sets the priority of the worker based on a boolean or number value. Has no effect if the worker is already running.

#### `waitFor()`

`()` => `Promise`

Returns a promise which resolves/rejects once the worker has succeeded, thrown an error, or aborted.

The data the promise resolves with is the return value of the original declaration function.

#### `justWaitFor()`

`()` => `Promise<void>`

Returns a promise that will always resolve when the worker finishes, regardless of whether it succeeded, errored out, or was aborted.

#### `on()`

`(callback: Function)` => `void`

Supports the `message`, `error`, `aborted`, `success`, and `started` events.

#### `ref()`, `unref()`, and `terminate()`

Refer to the [Node.js documentation](https://nodejs.org/api/worker_threads.html#workerunref) for more details.

## `BackgroundThreadzWorker`

This class cannot be directly interacted with, but can be instantiated via the [`createBackgroundWorker`](#threadzapi) function on a `ThreadzAPI` instance. Background workers work differently from regular workers, as they begin running when you call the `start()` function, and only finish when you call `end()`.

Normal `ThreadzWorker`s spin up a [`Worker`](https://nodejs.org/api/worker_threads.html#class-worker) for a single function call, then finish once the function has returned (or resolved with) some value. `BackgroundThreadzWorker`s allow you to spin up only one worker, then have access to calling any of your declared worker functions without needing to spin up a new `Worker` each time.

```TypeScript
// declarations.ts
import { declare, workerTools } from 'threadz';

export default declare({
    add: {
        worker: (num1: number, num2: number) => num1 + num2,
    },
    subtract: {
        worker: (num1: number, num2: number) => num1 - num2,
    },
});
```

```TypeScript
// index.ts
import api from './declarations.js';

const backgroundWorker = api.createBackgroundWorker();

// Spins up a single worker
await backgroundWorker.start();

const result = await backgroundWorker.call('add', 1, 2);

// The "subtract" worker function is being run on the same thread
// as the call for "add"
const result2 = await backgroundWorker.call('subtract', 5, 3);

// Ends the worker's process
backgroundWorker.end();

console.log(result, result2);
```

Though the output is the same, the functionality above is very different from this:

```TypeScript
// index.ts
import api from './declarations.js';

// Spins up a new Worker, runs the add function.
// The worker's process is ended once the add function returns.
const result = await api.workers.add(1, 2);

// Spins up a new Worker, runs the subtract function.
// The worker's process is ended once the subtract function returns.
const result2 = await api.workers.subtract(5, 3);

console.log(result, result2);
```

## ThreadzPool

The `ThreadzWorkerPool` (importable under the name `ThreadzPool`) is a single global object which implements a queuing system to manage workers and maintain a maximum concurrency.

### Methods & properties

The methods and properties on `ThreadzWorkerPool` make it easy to modify its maximum concurrency and get updates on its status.

#### `queueLength`

Get the current length of the queue.

#### `maxedOut`

Whether or not the max number of possible workers is running right now.

#### `currentlyActive`

The number of workers which are currently running.

#### `maxConcurrency`

The maximum number of workers that ThreadzWorkerPool will allow to run concurrently.

#### `setMaxConcurrency()`

`(value: MaxConcurrencyOptions | number` => `void`

Set the maximum concurrency of the ThreadzPool by either specifying how many workers you'd like to run at once with a number, or a `MaxConcurrencyOptions` (importable enum) value which dynamically calculates the max concurrency based on the resources the machine has.

**`MaxConcurrencyOptions`:**

- `1/4`
- `1/2`
- `3/4`
- `100%`
- `200%`
- `400%`

> **Note:** It is recommended to use `MaxConcurrencyOptions` instead of a hardset number.

#### `nextUp`

Retrieve the name, location, and arguments of the next worker in the queue to be run.

#### `dormant`

If `true`, the ThreadzWorkerPool is not currently running any workers and the queue is empty.

#### `on()`

`(callback: Function)` => `void`

Supports the `dormant` event.

## workerTools

The `workerTools` object is a set of tools intended for use exclusively within workers. It can be used to send and receive messages to and from the main thread, as well as communicate with other workers running on different threads.

```TypeScript
import { declare, workerTools } from 'threadz';

export default declare({
    myWorker: {
        worker: () => {
            workerTools.onParentMessage((data) => {
                console.log(data);
            });

            workerTools.sendMessageToParent('hey!');

            workerTools.abort();
        },
    },
});
```

### Methods & properties

There are currently 7 tools in the `workerTools` toolbox.

#### `sendMessageToParent()`

`(data: AcceptableDataType | SharedMemoryTransferObject, transferList?: TransferListItem[])` => `void`

Send a message to be consumed back on the main thread.

#### `onParentMessage()`

Pass a function to run any time a message is received from the parent thread. The data is passed in as the first parameter.

#### `waitForParentMessage()`

A function which takes in an assertion callback. The assertion callback takes in the received data and returns a boolean value. If the assertion returns `true`, the promise will resolve.

#### `sendCommunication()`

`(data: AcceptableDataType | SharedMemoryTransferObject, transferList?: TransferListItem[])` => `void`

If you have passed a message port to the worker (using the [`Interact` API](#interact-api)), send messages to the port with this function.

#### `onCommunication()`

If you have passed a message port to the worker (using the Interact API), listen for messages on the port with this function by passing a callback which takes in the received data.

#### `waitForCommunication()`

A function which takes in an assertion callback. The assertion callback takes in the received data and returns a boolean value. If the assertion returns `true`, the promise will resolve.

#### `threadID()`

Grab the unique ID of the thread currently being used.

#### `abort()`

`(message?: string)` => `never`

Immediately terminate the worker and return out with an `aborted` status.

#### `abortOnTimeout()`

`({ seconds, message }: { seconds: number, message: string })` => `never`

Prevent workers from hanging or running too long by aborting out after a certain amount of time has passed.

## `SharedMemory`

Sharing memory between multiple threads is simple with the Threadz `SharedMemory` API. Use the static `SharedMemory.from()` method to create a shared state which is retained on all threads.

```TypeScript
import { SharedMemory } from 'threadz';

const mem = SharedMemory.from<Record<string, string>>({ foo: 'bar' });

console.log(mem.get()); // -> { foo: 'bar' };

mem.setWith((prev) => {
    return {
        ...prev,
        fizz: 'buzz',
    };
});

console.log(mem.get());
```

### Methods & properties

There are a few different properties and methods on a `SharedMemory` instance to help you manipulate the data stored within its state, as well as send it to other threads.

#### `byteLength`

The byte length of the stored Uint8Array.

#### `transfer()`

`()` => `SharedMemoryTransferObject`

This is one of the most important methods on the `SharedMemory` API. Instances cannot be directly send to workers via parameters or messages, so they must be converted into `SharedMemoryTransferObjects`s using the `sharedMemory.transfer()` function.

**Example:**

**declarations.ts**:

```TypeScript
import { declare, SharedMemory } from 'threadz';
import type { SharedMemoryTransferObject } from 'threadz';

export default declare({
    myWorker: {
        // The memory data will come in as a SharedMemoryTransferObject
        worker: (transfer: SharedMemoryTransferObject<string>) => {
            // We can use the SharedMemory.from() function on a
            // SharedMemoryTransferObject and continue using the
            // SharedMemory API to manipulate the data.
            const mem = SharedMemory.from(transfer);

            console.log(mem.get());
        },
    },
});
```

**index.ts**:

```TypeScript
import { SharedMemory } from 'threadz';
import api from './declarations';

const mem = SharedMemory.from('hey');

// The SharedMemory instance must be converted into a
// SharedMemoryTransferObject when passed into a worker
await api.workers.myWorker(mem.transfer());
```

#### `get()`

`(microtask?: boolean)` => `unknown`

Get the current state.

Pass in `true` to run the operation as a microtask (returns a promise).

#### `wipe()`

`(microtask?: boolean)` => `void`

Entirely reset the memory space (not deletion of the memory space!).

Pass in `true` to run the operation as a microtask (returns a promise).

#### `set()`

`(data: AcceptableDataType)` => `void`

Set a new value for the current memory space.

Pass in `true` to run the operation as a microtask (returns a promise).

#### `setWith()`

`(callback: (data: AcceptableDataType) => AcceptableDataType)` => `void`

Set a new state with a callback function taking in the previous data and returning the new data to be written to memory.

## License

MIT
