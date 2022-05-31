# Threadz

![ts](https://flat.badgen.net/badge/Built%20With/TypeScript/blue) ![npm](https://img.shields.io/npm/dw/threadz) ![npm](https://img.shields.io/npm/v/threadz)

## About

**Threadz** is a multithreading library that can be used for offloading expensive operations onto separate threads in order to boost performance, or to run complex concurrent multi-threaded operations which share memory and pass messages back and forth. The goal of **Threadz** is to make multi-threading in Node.js accessible and easy with very little boilerplate. The general workflow looks like this:

1. Declare your "worker" functions using the `declare` function.
2. Add optional configurations for the `Worker` instance within your declarations.
3. Use the worker-ified functions in your code as you normally would, with full TypeScript support.

Each worker is passed through a `WorkerPool` implementation, which by default prevents more than 2 worker threads from running per core at one time and queues up workers when the limit of currently active workers is reached.

## Get started

Get started by installing **Threadz** via NPM.

```shell
npm install threadz
```

## Table of contents

-   [Examples](#examples)
    -   [Basic example](#basic-example)
    -   [Basic async example](#basic-async-example)
-   [Using `declare`](#using-declare)
-   [**ThreadzAPI**](#threadzapi)
    -   [Running workers](#running-workers)
    -   [Running workers in parallel](#running-workers-in-parallel)
    -   [`_threadz` pseudo API](#threadz-pseudo-api)
-   [`Interact`ing with workers](#interacting-with-workers)
    -   [Running workers with `Interact`](#running-workers-with-interact)
    -   [Listening for events](#listening-for-events)
    -   [Sharing memory with `SharedMemory`](#sharing-memory-with-sharedmemory)
        -   [Creating shared memory space](#creating-shared-memory-space)
        -   [Passing `SharedMemory` to workers](#passing-sharedmemory-to-workers)
    -   [Sending & receiving messages](#sending--receiving-messages)
        -   [Sending a message to a worker](#sending-a-message-to-a-worker)
        -   [Sending a message from a worker](#sending-a-message-from-a-worker)
-   [Future prospects](#future-prospects)
-   [License](#license)

## Examples

Throughout the README, you will see various examples using all of the available **Threadz** APIs. Here are two basic examples to help understand the basics of multithreading with **Threadz**:

### Basic example

This is a simple example to demonstrate that the operations are in fact running on separate threads.

```TypeScript
// workers.ts
import { declare } from 'threadz';

export default declare({
    hugeLoop: {
        worker: (output: string) => {
            for (const _ of Array(999999999).keys()) {
                // this is normally a huge operation that
                // would block the main thread.
            }
            console.log(output);
        },
    },
});
```

```TypeScript
// index.ts
import WORKERS from './workers';

(async () => {
    // This method can also be awaited. The difference is
    // that it will not be blocking the entire main thread,
    // but instead just the function it is within.
    WORKERS.hugeLoop('hello threadz!');

    // Normally, if we didn't wrap the huge loop in a Threadz
    // declaration, this would be logged last.
    console.log('hello');
})();
```

**Output:**

```text
hello
hello threadz!
```

### Basic async example

A much more realistic example where parameters are passed in and data is returned.

```TypeScript
// workers.ts
import { declare } from 'threadz';
import axios from 'axios';

export default declare({
    makeRequest: {
        worker: async (url: string) => {
            const { data } = await axios(url);

            return data;
        },
    },
});
```

```TypeScript
// index.ts
import WORKERS from './workers';

(async () => {
    // This request is being made on a separate thread
    const res = await WORKERS.makeRequest('https://google.com');

    console.log(res);
})();
```

## Using `declare`

In order to run multithreaded operations, you must `declare` your workers. Simply import the `declare` function, call it, and make its return value the default export of the file.

```TypeScript
import { declare } from 'threadz';

export default declare({
    // This is the name by which we'll
    // be calling the function later on
    foo: {
        // This is the operation which will be run in
        // a separate thread
        worker: () => console.log('bar'),
    },
});
```

These functions work just like normal functions. They can take parameters, return data, and access imported stuff. You also don't have to define the functions right within the declarations file - they can be imported from elsewhere.

Optionally, you can pass an `options` object within a declaration. These are the default options for the vanilla `Worker` class. Learn more about these options in the [Node.js documentation](https://nodejs.org/api/worker_threads.html#new-workerfilename-options).

```TypeScript
import { declare } from 'threadz';

export default declare({
    foo: {
        worker: () => console.log('bar'),
        options: {
            resourceLimits: {
                maxOldGenerationSizeMb: 69,
            },
        },
    },
});
```

You don't have to define all of your workers in one file inside one declaration function - you can modularize as much as you like. The important thing to take home is that the return value of the `declare` function must **always** be the default export of the file.

## ThreadzAPI

**ThreadzAPI** is the return value of the `declare` function, on which you can access each of your declared workers through dot notation. Parameters are passed in the same exact way you'd normally pass them in if the function wasn't wrapped in a **Threadz** declaration.

### Running workers

```TypeScript
import WORKERS from './workers';

(async () => {
    await WORKERS.foo() // -> logs 'bar' to the console;
})();
```

An important thing to note is that these worker-ified functions will always return promises, even if the function in the declarations is not async.

If you're using TypeScript, you will not lose type support by using these functions. The TypeScript compiler will still yell at you if you haven't passed in the correct types or number of parameters, or try to improperly use the function's return value.

> **Threadz** workers are set to automatically always share environment variables.

### Running workers in parallel

It is 100% safe to run workers in parallel. The `WorkerPool` will only allow a certain amount of workers to be active at one time (based on the number of cores your machine has, or set manually with the `setMaxWorkers` function).

If the number of active workers has reached the limit, all other calls of worker functions will be added to a queue and forced to wait for an open slot. This means that doing something like this (though discouraged) is safe:

```Typescript
import WORKERS from './workers';

(async () => {
    // This will run our "foo" function 1000 time, but the WorkerPool
    // will not allow all workers to be spawned and executed at once.
    await Promise.all(Array(1000).fill(null).map(() => WORKERS.foo()));
})();
```

In order to set a custom limit for the max number of workers that can be run at one time, import and use the `setMaxWorkers` function above your declarations like so:

```TypeScript
import { declare, setMaxWorkers } from 'threadz';

setMaxWorkers(2);

export default declare({
    foo: {
        worker: () => console.log('bar'),
    },
});
```

> **WARNING**: Setting this to a ridiculously high number is dangerous. Don't do that please.

### `_threadz` pseudo-API

If you try to declare a worker with the name `_threadz`, an error will be thrown, as it is reserved for the **\_Threadz** API.

```TypeScript
// The current number of active workers
WORKERS._threadz.activeWorkers();

// The maximum number of workers allowed by the WorkerPool.
WORKERS._threadz.maxWorkers();

// Your original declarations.
WORKERS._threadz.declarations;

// The location of the declaration file
// for these declarations.
WORKERS._threadz.location;

// All onParentMessage callback functions.
WORKERS._threadz.onParentMessageCallbacks;
```

## `Interact`ing with workers

Though the **ThreadzAPI** is great for running functions as normal on separate threads, it does not provide the ability to send messages back and forth between the main thread and the worker thread. This is where `Interact` comes in handy.

### Running workers with `Interact`

Instead of returning a promise, `Interact` returns a `ThreadzWorker` instance, on which events can be listened for, or it can just be waited for with `waitFor`.

```TypeScript
import { Interact } from 'threadz';
import WORKERS from './workers';

(async () => {
    // Pass in the function returned from ThreadsAPI into the .with() call
    const worker = Interact.with(WORKERS.foo).go();

    await worker.waitFor();
})();
```

If the worker returned anything, it will be returned from the `waitFor` call.

> Don't forget to add `.go()` to the very end, or else the worker will never be run and a `ThreadzWorker` instance won't be returned!

### Listening for events

The worker itself has two events, `success` and `error`. If the worker returned anything, the return value will be passed into the callback function when listening for the `success` event. For the `error` event, the error will be passed in.

```TypeScript
import { Interact } from 'threadz';
import WORKERS from './workers';

(async () => {
    const worker = Interact.with(WORKERS.foo).go();

    // Listen for the "success" event
    worker.on('success', (data) => {
        console.log(data);
    });

    // Listen for the "error" event
    worker.on('error', (err) => {
        console.error(err);
    });
})();
```

### Sharing memory with `SharedMemory`

#### Creating shared memory space

Sharing memory between threads would normally be more difficult without `SharedMemory`. Simply create an instance by passing in a JSON serializable value into the `.from` method:

```Typescript
import { SharedMemory } from 'threadz';

(async () => {
    const data = SharedMemory.from({ foo: 'bar' });
})();
```

> An optional second parameter can be provided, which specifies the size (in MB) to make the [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer). It defaults to **1MB**, which is quite generous.

It can then be mutated and accessed asynchronously using `set` and `get`:

```Typescript
import { SharedMemory } from 'threadz';

(async () => {
    const data = SharedMemory.from({ foo: 'bar' });

    await data.set({ foo: 'bar-baz' });

    const item = await data.get();

    console.log(item);
})();
```

Or synchronously using `setSync` and `getSync`:

```TypeScript
import { SharedMemory } from 'threadz';

(async () => {
    const data = SharedMemory.from({ foo: 'bar' });

    data.setSync({ foo: 'bar-baz' });

    const item = data.getSync();

    console.log(item);
})();
```

#### Passing `SharedMemory` to workers

We've declared a simple worker function called `printValue` which takes in a `SharedMemory` instance, grabs the value, and returns it:

```TypeScript
// workers.ts
import { declare, SharedMemory } from 'threadz';

export default declare({
    getValue: {
        // Take in the SharedMemory instance
        worker: async (mem: SharedMemory<{ foo: string }>) => {
            // Get the value
            const val = await mem.get();
            // Return it
            return val;
        },
    },
});
```

Every instance of `SharedMemory` has a special method called `pass`, which allows it to be passed into and used within the worker. If this method is not used when passing the instance as an argument, Node will throw an error.

```TypeScript
import { SharedMemory, Interact } from 'threadz';
import WORKERS from './workers';

(async () => {
    const data = SharedMemory.from({ foo: 'bar' });

    // Use .args() to pass arguments to a worker function when using Interact
    const worker = Interact.with(WORKERS.getValue).args(data.pass()).go();

    const fromWorker = await worker.waitFor();

    console.log(fromWorker);
})();
```

Keep in mind that you do not have to use `Interact` in order to take advantage of `SharedMemory`'s benefits. You can still use the regular **ThreadzAPI**:

```TypeScript
// index.ts
import { SharedMemory } from 'threadz';
import WORKERS from './workers';

(async () => {
    const data = SharedMemory.from({ foo: 'bar' });

    const fromWorker = await WORKERS.getValue(data.pass());

    console.log(fromWorker);
})();
```

Both of the above examples will do the same exact thing. Only use `Interact` if you want to do message passing.

> In the event of passing or returning a `SharedMemory` instance from a worker back to the main thread, you must also use the `.pass` method. You can then use `SharedMemory.from()` on the object returned.

### Sending & receiving messages

To demonstrate message passing, we'll be using this worker declaration file:

```TypeScript
// workers.ts
import { declare, SharedMemory } from 'threadz';

export default declare({
    getValue: {
        worker: async (mem: SharedMemory<{ foo: string }>) => {
            // wait for 10 seconds before completing
            await new Promise((r) => setTimeout(r, 10000));
        },
    },
});
```

#### Sending a message to a worker

Sending a message to a worker with `Interact` is easy. Just use the `.sendMessage` method:

```TypeScript
// index.ts
import { SharedMemory, Interact } from 'threadz';
import WORKERS from './workers';

(async () => {
    const data = SharedMemory.from({ foo: 'bar' });

    const worker = Interact.with(WORKERS.getValue).args(data.pass()).go();

    worker.sendMessage('hello');

    await worker.waitFor();
})();
```

To listen for messages from the parent thread, you must define a special `onParentMessage` function within the worker declaration:

```TypeScript
// workers.ts
import { declare, SharedMemory } from 'threadz';

export default declare({
    getValue: {
        worker: async (mem: SharedMemory<{ foo: string }>) => {
            await new Promise((r) => setTimeout(r, 10000));
        },
        // The first parameter of this function is the data which was passed in.
        // The second parameter is the first SharedMemory instance that was passed
        // into the function. If there is no SharedMemory instance, the second
        // parameter will be undefined.
        onParentMessage: (data: string, mem: SharedMemory<{foo: string}>) => {
            // Log the received message
            console.log(data);
            // Log the shared memory
            console.log(mem.getSync());
        },
    },
});
```

**Output:**

```text
hello
{ foo: 'bar' }
```

#### Sending a message from a worker

Using the `toolBox`, you can send messages to the parent thread right within your worker.

```TypeScript
// workers.ts
// import toolBox
import { declare, SharedMemory, toolBox } from 'threadz';

export default declare({
    getValue: {
        worker: async (mem: SharedMemory<{ foo: string }>) => {
            // destructure the sendMessageToParent function from toolBox
            const { sendMessageToParent } = toolBox();

            // wait 5 seconds
            await new Promise((r) => setTimeout(r, 5000));

            // send a message to the parent
            sendMessageToParent('this is a message');

            // wait 5 more seconds
            await new Promise((r) => setTimeout(r, 5000));
        },
    },
});
```

> `toolBox` currently offers three other tools - `isMainThread`, `threadId`, and the `abort` function.

To listen for messages back in the parent, there are two ways you can do it. Either use the `.onMessage` method in the `Interact` method chain, or directly on the worker.

```TypeScript
import { SharedMemory, Interact } from 'threadz';
import WORKERS from './workers';

(async () => {
    const data = SharedMemory.from({ foo: 'bar' });

    const worker = Interact.with(WORKERS.getValue).args(data.pass()).go();

    worker.onMessage<string>((data) => console.log(data));

    await worker.waitFor();
})();
```

```TypeScript
import { SharedMemory, Interact } from 'threadz';
import WORKERS from './workers';

(async () => {
    const data = SharedMemory.from({ foo: 'bar' });

    const worker = Interact.with(WORKERS.getValue)
        .args(data.pass())
        .onMessage<string>((data) => console.log(data))
        .go();

    await worker.waitFor();
})();
```

Unlike with `onParentMessage`, the `SharedMemory` instance is not passed into the callback of `onMessage`.

## Future prospects

In the future, it would be nice to support message channeling.

## License

MIT :)
